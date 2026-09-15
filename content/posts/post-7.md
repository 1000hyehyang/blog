---
{
  "title": "어디더라 고쳐쓰기 #07 비동기 스레드 풀 튜닝",
  "category": {
    "name": "Development",
    "slug": "development"
  },
  "tags": [
    "Spring Boot",
    "ThreadPoolExecutor",
    "HikariCP",
    "Micrometer"
  ],
  "excerpt": "어디더라의 링크 분석 API는 링크를 DB에 저장한 뒤 사용자에게 먼저 응답하고, Processing Server의 작업 생성 API는 별도 Executor에서 호출한다. 프로젝트 초기에는 실제 운영 지표가 없어 AI에 현재 서비스 구조를 설명하고, 안정적으로 운영할…",
  "coverImage": {
    "src": "https://images.unsplash.com/photo-1755502046743-78265e184cc3?q=80&w=2167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "featured": false,
  "featuredOrder": 1,
  "published": true,
  "slug": "post-7",
  "id": "post-7",
  "createdAt": "2026-08-23T11:34:34Z",
  "lastEditedAt": "2026-09-04T20:20:52Z",
  "commentsCount": 0,
  "reactionsCount": 0
}
---
어디더라의 링크 분석 API는 링크를 DB에 저장한 뒤 사용자에게 먼저 응답하고, Processing Server의 작업 생성 API는 별도 Executor에서 호출한다.

프로젝트 초기에는 실제 운영 지표가 없어 AI에 현재 서비스 구조를 설명하고, 안정적으로 운영할 수 있는 범위의 초기 후보를 추천받아 다음 설정을 사용했다.

```text
Executor: core=2, max=4, queue=100
HikariCP: maximum=20, minimum-idle=5
```

각 숫자가 현재 서비스에 적절한지는 검증되지 않았기 때문에, 값을 바로 바꾸기보다 기존 설정에서 API 응답뿐 아니라 Executor queue와 DB connection을 함께 측정했다.

## 무엇을 측정했나

실제 Processing Server를 호출하면 네트워크 상태와 외부 제한이 섞인다. 동일한 조건에서 설정만 비교하기 위해 WireMock으로 외부 API의 2초 지연을 재현하고, k6로 링크 분석 요청을 전송했다.

| 항목 | 조건 |
|---|---|
| 요청률 | 초당 5건 |
| 측정 시간 | 45초 |
| 전체 요청 | 226건 |
| 외부 API 지연 | 고정 2초 |

API 평균·p95와 함께 다음 내부 지표를 1초마다 수집했다.

- Executor active thread, queue, completed, rejected
- Hikari active·pending connection, 획득 대기시간, timeout

## 왜 초당 5건과 2초였나

이 값은 실제 운영 트래픽을 가정한 것이 아니라 기존 Executor의 포화 과정을 짧은 시간 안에 관찰하기 위한 스트레스 조건이다.

외부 호출 한 건이 2초 걸리면 core thread 2개의 처리량은 약 1건/초다.

```text
처리량 ≈ thread 수 ÷ 처리 시간
       ≈ 2 ÷ 2초
       ≈ 초당 1건
```

초당 5건이 들어오면 queue는 약 4건/초씩 증가하므로 100칸이 약 25초 만에 찬다. 그 뒤에야 thread가 max 4개까지 늘어나며, 이때도 처리량은 약 2건/초라 거절이 발생한다.

`5건/초·2초`는 운영 설정을 결정하는 값이 아니라 **현재 설정의 한계와 실패 방식**을 확인하기 위한 조건이다. 실제 운영값은 향후 피크 링크 요청률과 Processing Server 응답시간의 p95·p99를 수집한 뒤 별도로 정해야 할 것이다.

## 기준 설정의 결과

```text
API p95                 22.099ms
Executor active max     4
Executor queue max      100
Executor rejected       60
Hikari active max       2
Hikari pending max      0
Hikari acquire max      7.575ms
Hikari timeout          0
```

API 실패율은 0%였고 p95도 22ms였다. 하지만 내부에서는 queue가 상한인 100까지 찼고 비동기 작업 60건이 거절됐다.

`ThreadPoolExecutor`는 core thread가 모두 사용 중이면 먼저 queue를 채우고, queue가 가득 찬 뒤에야 max까지 thread를 늘린다. 따라서 `core=2, max=4, queue=100`은 부하가 생겼을 때 thread 4개를 바로 사용하는 설정이 아니었다.

큰 queue는 순간적인 요청 증가를 흡수할 수 있지만 지속적인 처리량을 늘리지는 않는다. 처리량을 넘는 부하가 계속되면 작업을 메모리에 오래 보관하면서 거절 시점만 늦춘다.

## 후보값은 어떻게 정했나

초당 5건이 들어오고 한 건을 처리하는 데 2초가 걸리므로, queue가 계속 쌓이지 않으려면 평균적으로 약 10개의 작업을 동시에 실행할 수 있어야 한다.

이 스트레스 조건을 처리하기 위한 비교 후보는 다음과 같이 정했다.

```text
Executor: core=10, max=10, queue=20
HikariCP: maximum=5
```

`core=max=10`은 필요한 10개 thread가 queue를 먼저 채우지 않고 바로 실행되게 하기 위한 값이다. queue 20은 짧은 트래픽 변동은 흡수하되 과부하를 오랫동안 숨기지 않기 위한 실험값이다.

## 기준값과 후보값 비교

| 지표 | 기준 `2/4/100`, Hikari 20 | 후보 `10/10/20`, Hikari 5 |
|---|---|---|
| API p95 | 22.099ms | 19.409ms |
| API 실패율 | 0% | 0% |
| Executor active 최대 | 4 | 10 |
| Executor queue 최대 | 100 | 2 |
| Executor rejected | 60 | 0 |
| Hikari active 최대 | 2 | 2 |
| Hikari pending 최대 | 0 | 0 |
| Hikari timeout | 0 | 0 |

후보 설정에서는 queue 최대가 100에서 2로 줄고 거절 작업이 60건에서 0건이 됐다.

외부 HTTP 호출 전후의 DB transaction이 분리되어 있어 응답을 기다리는 동안에는 DB connection을 점유하지 않았다. 측정에서도 active connection이 최대 2개에 그쳐, 비교 후보의 Hikari maximum pool size를 20에서 5로 줄여 다시 검증했다.

실제로 Hikari maximum을 20에서 5로 줄여도 active 최대는 2였고 pending과 timeout은 발생하지 않았다.

## 결론

분석 요청 생성 API 응답률과 응답시간은 나쁘지 않아 보였지만, 뒤에서는 작업 60건이 거절되고 있었다.

이번 후보값은 스트레스 조건을 처리하기 위한 비교값이지 운영 최종값은 아니다. 운영 설정은 실제 피크 요청률과 외부 API 지연을 기준으로 정하고, 그보다 높은 부하에서는 거절된 작업을 관측하고 안전하게 복구할 수 있는지 별도로 검증해야 한다.
