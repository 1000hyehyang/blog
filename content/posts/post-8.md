---
{
  "title": "어디더라 고쳐쓰기 #08 비동기 작업의 유실과 중복",
  "category": {
    "name": "Development",
    "slug": "development"
  },
  "tags": [
    "PostgreSQL",
    "Partial Index"
  ],
  "excerpt": "어디더라는 링크 분석 요청을 DB에 저장한 뒤 AFTER COMMIT + @Async 로 Processing Server에 작업 생성을 요청한다. API 응답과 무거운 외부 작업을 분리할 수 있다는 장점이 있지만, DB commit 직후 서버가 종료되거나 executo…",
  "coverImage": {
    "src": "https://images.unsplash.com/photo-1755502046743-78265e184cc3?q=80&w=2167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "featured": false,
  "featuredOrder": 1,
  "published": true,
  "slug": "post-8",
  "id": "post-8",
  "createdAt": "2026-08-23T15:50:17Z",
  "lastEditedAt": "2026-09-04T20:20:53Z",
  "commentsCount": 0,
  "reactionsCount": 0
}
---
어디더라는 링크 분석 요청을 DB에 저장한 뒤 `AFTER_COMMIT + @Async`로 Processing Server에 작업 생성을 요청한다. API 응답과 무거운 외부 작업을 분리할 수 있다는 장점이 있지만, DB commit 직후 서버가 종료되거나 executor가 작업을 거절하면 **DB에는 요청이 남았는데 Processing Server에는 작업이 없는 상태**가 생길 수 있다.

기존에는 `Link` 상태를 기준으로 이런 요청을 복구했다. 하지만 자동 복구와 수동 재시도가 추가되면서 링크의 분석 상태와 외부 전송 이력을 한 행에서 함께 관리하기 어려워졌다.

그래서 **Processing Server로 작업 생성을 시도하는 한 번의 전송**을 `LinkProcessingDispatchAttempt`로 분리했다.

## 전송할 작업 자체를 먼저 DB에 남긴다

새 분석을 시작할 때 하나의 DB transaction에서 다음 데이터를 함께 저장한다.

* `Link`
* `LinkAnalysisRequest`
* `LinkProcessingDispatchAttempt(PENDING)`

commit 이후 이벤트에는 `dispatchAttemptId`만 전달한다. 비동기 worker는 해당 attempt를 claim한 뒤 Processing Server를 호출하고, 외부 호출이 끝난 후 별도 transaction에서 `jobId`와 상태를 반영한다.

따라서 commit 직후 서버가 종료되더라도 `PENDING` attempt가 DB에 남아 있어 이후 recovery 대상이 된다. 또한 외부 HTTP 응답을 기다리는 동안 DB transaction이나 connection을 유지하지 않는다.

## 링크당 활성 attempt는 하나만 허용한다

진행 중인 attempt에는 `active_slot=1`, 완료되거나 실패한 attempt에는 `NULL`을 저장하고 DB에 다음 unique constraint를 둔다.

```sql
UNIQUE (link_id, active_slot)
```

PostgreSQL unique constraint는 여러 `NULL`을 허용하므로 과거 attempt 이력은 여러 건 저장할 수 있지만, `active_slot=1`인 현재 attempt는 링크당 하나만 존재할 수 있다.

즉 애플리케이션의 사전 조회뿐 아니라 **DB 제약으로 동시에 두 개의 활성 전송이 생성되는 상황을 방어**한다.

worker가 attempt를 가져갈 때는 `claimToken`도 기록한다. stale attempt를 다른 worker가 다시 claim하면 token이 변경되기 때문에, 이전 worker가 뒤늦게 응답하더라도 현재 worker의 상태를 덮어쓸 수 없다.

## PostgreSQL에서 동시 요청을 확인했다

기존 주요 동시성 테스트는 H2 profile을 사용하고 있어, 실제 DB 제약까지 확인하기 위해 Docker PostgreSQL 17 환경에서 같은 Instagram URL을 20 VU가 동시에 요청하도록 했다.

| 결과      |                                관측값 |
| ------- | --------------------------------- |
| 응답      | `201 Created` 1건, `200 OK` 재사용 19건 |
| HTTP 실패 |                                 0건 |
| 최종 DB   | link·analysis request·attempt 각 1건 |
| attempt |                       `DISPATCHED` |

동시에 같은 요청이 들어와도 실제로 생성되는 분석 요청과 활성 attempt는 하나뿐이었다. PostgreSQL에 partial recovery index와 `(link_id, active_slot)` unique constraint가 적용된 것도 함께 확인했다.

## 복구 쿼리는 활성 attempt만 탐색한다

https://blog.1000hyehyang.me/posts/20

[이전 글](https://blog.1000hyehyang.me/posts/20)에서는 links 테이블의 상태를 기준으로 누락된 요청을 찾았고, 100만 건 중 복구 후보 95건을 조회하는 쿼리에 partial index를 적용해 전체 Seq Scan을 제거했다.

이후 외부 전송의 생명주기를 LinkProcessingDispatchAttempt로 분리하면서 복구 기준도 Link에서 활성 attempt로 바뀌었다. 기존에 확인했던 인덱스 개선 효과가 현재 구조에서도 유지되는지 확인하기 위해 같은 규모에서 다시 측정했다.

link와 attempt를 각각 100만 건 생성하고, 그중 활성 attempt 100건과 cutoff를 지난 복구 대상 95건을 구성했다.

recovery index는 다음 partial index로 만들었다.

```sql
(status, claimed_at, created_at, id)
WHERE active_slot = 1
```

batch 50 기준 실행 계획은 전체 데이터를 탐색하는 Seq Scan에서 활성 attempt만 탐색하는 Bitmap Index Scan으로 변경됐다.

| 지표            |               index 없음 |             partial index |
| ------------- | --------------------- | ------------------------ |
| 실행 시간         |               32.104ms |                   0.167ms |
| batch 50 p95  |               37.053ms |                   0.273ms |
| 탐색            |        100만 건 Seq Scan | 활성 100건 Bitmap Index Scan |
| shared buffer | hit 1,542 / read 7,192 |          hit 382 / read 1 |
| index 크기      |                      - |                      16kB |

이전 일반 B-tree는 완료된 attempt까지 포함해 7,024kB였지만, partial index는 활성 100건만 포함해 16kB였다.

p95는 이전 일반 인덱스의 0.121ms보다 0.273ms로 조금 높아졌지만 여전히 1ms 미만이었고, 대신 index 크기는 약 99.8% 감소했다. 현재처럼 **완료 이력은 많고 활성 작업은 적은 구조에서는 활성 집합만 인덱싱하는 편이 더 적합하다**고 판단했다.


## 재시도해도 같은 Processing Job으로 수렴시킨다

Dispatch attempt를 남기면 전송 자체의 유실은 복구할 수 있지만 또 하나의 경계가 남는다.

Processing Server가 이미 job을 생성했는데 Backend가 `jobId`를 저장하기 전에 종료되면, recovery 과정에서 같은 요청을 다시 보낼 수 있다. 이 경우 Processing Server에 동일한 job이 여러 개 생성될 수 있다.

이를 막기 위해 `POST /jobs`에 `Idempotency-Key`를 필수로 추가했다.

Backend는 같은 dispatch attempt의 최초 전송, 내부 재시도, stale 복구에 항상 동일한 key를 사용한다. Processing Server는 이를 unique 제약으로 저장하고, 같은 key가 다시 들어오면 새로운 job을 생성하거나 enqueue하지 않고 기존 `jobId`를 반환한다.

따라서 Backend가 중간에 종료되어 요청을 다시 보내더라도:

```text
하나의 DispatchAttempt
        ↓
동일한 Idempotency-Key
        ↓
하나의 Processing Job
```

으로 수렴한다.

## 결론

이번 개선에서는 링크의 분석 상태와 Processing Server로의 전송 상태를 분리했다.

`DispatchAttempt`를 먼저 DB에 저장해 전송 실패를 복구할 수 있도록 했고, DB unique constraint로 링크당 활성 attempt를 하나로 제한했다. `claimToken`으로 stale worker의 뒤늦은 상태 변경을 막았으며, `Idempotency-Key`를 추가해 재시도가 발생해도 Processing Server에는 동일한 job이 중복 생성되지 않도록 했다.
