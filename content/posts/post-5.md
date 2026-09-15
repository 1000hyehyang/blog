---
{
  "title": "어디더라 고쳐쓰기 #05 Spring Cache와 Caffeine 로컬 캐시",
  "category": {
    "name": "Development",
    "slug": "development"
  },
  "tags": [
    "Spring Boot",
    "Spring Cache",
    "Caffeine",
    "JPA",
    "Hibernate",
    "Local Cache",
    "k6"
  ],
  "excerpt": "어디더라에서 장소를 저장하면 전달받은 주소를 시도·시군구로 변환하고, 카카오 카테고리를 우리 서비스의 자체 카테고리와 태그로 분류한다. 카카오 API에서 제공하는 카테고리는 음식점, 카페처럼 비교적 큰 범위다. 그리고 '데이트' 목적에 맞지 않는 카테고리 분류가 더 많…",
  "coverImage": {
    "src": "https://images.unsplash.com/photo-1755502046743-78265e184cc3?q=80&w=2167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "featured": true,
  "featuredOrder": 1,
  "published": true,
  "slug": "post-5",
  "id": "post-5",
  "createdAt": "2026-08-16T14:17:55Z",
  "lastEditedAt": "2026-09-04T20:20:50Z",
  "commentsCount": 0,
  "reactionsCount": 0
}
---
어디더라에서 장소를 저장하면 전달받은 주소를 시도·시군구로 변환하고, 카카오 카테고리를 우리 서비스의 자체 카테고리와 태그로 분류한다.

![](https://github.com/user-attachments/assets/739f1a72-ab47-4983-b4b1-9a824d78b9b9)

카카오 API에서 제공하는 카테고리는 음식점, 카페처럼 비교적 큰 범위다. 그리고 '데이트' 목적에 맞지 않는 카테고리 분류가 더 많다.

![](https://github.com/user-attachments/assets/36808295-b011-45a8-9f7e-1d32eaf93252)

어디더라에서는 한식, 일식, 베이커리, 보드카페처럼 장소를 더 구체적으로 나누어 보여 주고 싶어서 자체 분류 체계를 만들었다.

지역과 장소 분류 데이터는 애플리케이션이 시작될 때 seed되고 이후에는 거의 바뀌지 않는다.

따라서 캐시를 적용하기로 했다.

캐시가 없어도 기능에는 문제가 없다. 데이터가 그리 크지 않기 때문이다. 현재 seed 기준으로 지역은 시도 17개와 시군구 255개, 장소 분류는 카테고리 3개와 활성 태그 23개뿐이다.

하지만 장소 하나를 저장할 때마다 지역 272행을 다시 읽고, 분류를 위해 같은 카테고리와 태그를 다시 읽는 것은 비효율적이지 않나... 데이터는 거의 변하지 않는데 요청 수에 비례해 같은 DB 조회와 객체 생성이 반복되니까.

## `@Cacheable`은 항상 동작할까?

기존 지역 주소 해석 코드는 같은 클래스 안의 메서드를 호출하는 구조였다.

```java
public ResolvedRegion resolve(String address, String roadAddress) {
    ResolvedRegion roadAddressRegion = resolveOne(roadAddress);
    // ...
}

private ResolvedRegion resolveOne(String address) {
    for (SidoMatcher matcher : activeSidoMatchers()) {
        // ...
    }
}

@Cacheable(cacheNames = "regionSidoMatchers", key = "'all'")
public List<SidoMatcher> activeSidoMatchers() {
    // DB 조회
}
```

![](https://github.com/user-attachments/assets/79b730fd-41a3-4347-acf9-533c6f69b411)

이게 기대한 동작이었다.

`@Cacheable`이 실제로 기준정보 조회를 줄이고 있는지 확인하려고 Hibernate Statistics로 쿼리 수를 측정했다. 그런데 지역 주소 해석을 5회 호출했을 때 statement가 10개 발생했고, 장소 분류도 5회에 10개가 발생했다. 기대와 달리 같은 쿼리가 매번 실행되고 있었다.

이번에 처음 알게 된 부분인데, Spring Cache의 기본 방식은 대상 객체 앞에 프록시를 두고 그 프록시가 메서드 호출을 가로채는 구조다.

같은 객체 내부에서 자신의 메서드를 호출하면 프록시를 거치지 않는다. 결국, `@Cacheable`을 적었지만 실제 캐시는 적용되지 않았던 것이다.

https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html#cache-annotations-enable

Spring 공식 문서를 보면 기본 proxy mode에서는 프록시를 통과하는 외부 호출만 가로채며, self-invocation은 실제 캐싱으로 이어지지 않는다고 설명한다.


## Caffeine을 처음 사용해 보았다

기존에는 Spring의 `ConcurrentMapCacheManager`와 직접 만든 `ConcurrentHashMap` 캐시를 사용하고 있었다.

특히 링크 분석 상태 조회에는 결과를 2초 동안 저장하는 직접 만든 캐시가 있었다.

![](https://github.com/user-attachments/assets/be60bfb7-93cf-408e-916c-7fa104c40b25)

Frontend는 분석이 끝날 때까지 2초마다 상태를 조회한다. 같은 링크의 조회가 짧은 시간에 겹치면 첫 요청만 DB와 Processing Server에서 상태를 확인하고, 나머지는 캐시된 결과를 사용하도록 했다. 캐시는 2초 뒤 만료되므로 다음 polling에서는 최신 상태를 다시 확인할 수 있다.

즉, 캐시를 둬서 **polling 과정의 중복 상태 조회를 줄이도록** 했다.

기존 구현은 만료 시각을 값과 함께 `ConcurrentHashMap`에 저장하고, 같은 링크가 다시 조회될 때 만료된 항목을 제거했다.

```text
link A 저장 → 2초 뒤 만료
link B 저장 → 2초 뒤 만료
link C 저장 → 2초 뒤 만료
...
```

여기서 만료는 더 이상 그 값을 반환하지 않는다는 뜻이지, Map에서 즉시 삭제된다는 뜻은 아니었다. 기존 코드는 같은 link key가 다시 조회될 때만 만료 여부를 확인하고 항목을 제거했다. 따라서 A, B, C가 다시 조회되지 않으면 만료된 값은 사용되지는 않지만 Map의 메모리에는 계속 남았다.

서로 다른 링크가 계속 들어오는 상황에서는 논리적으로 만료된 항목이 쌓이면서 Map 크기가 계속 커질 수 있었다. 완료 결과를 계속 재사용하려고 남긴 것이 아니라, 만료 항목을 정리하는 시점이 같은 key의 다음 조회에만 묶여 있었던 것이 문제였다.

이 문제를 해결할 방법을 찾으면서 Caffeine을 처음 알게 되었다.

Caffeine은 애플리케이션 프로세스 안에서 사용하는 로컬 캐시 라이브러리다. 만료 시간뿐 아니라 최대 항목 수를 정할 수 있고, 항목 제거와 통계도 지원한다.

https://github.com/ben-manes/caffeine/wiki/Eviction

같은 이유로 지역과 장소 분류의 기준정보도 Caffeine으로 관리하기로 했다.

지역 seed는 동기로 완료하되 Caffeine은 lazy load하도록 분리했다. 애플리케이션 시작 과정에서는 seed만 끝내고, 실제로 catalog가 처음 필요할 때 별도의 Provider가 DB에서 값을 읽어 Caffeine에 저장한다. 이후 요청은 같은 catalog를 재사용한다.

Redis도 사용하지 않았다. 현재는 단일 애플리케이션 인스턴스이고 catalog 전체가 약 300행으로 작다. 이 데이터를 읽기 위해 굳이 비용을 추가하기보다 같은 JVM 안에서 조회하는 로컬 캐시가 현재 규모에 맞다고 생각했다.

기존 `ConcurrentHashMap`을 계속 확장할 수도 있지만, 그러려면 TTL 확인, 만료 항목 정리, 최대 크기, 동시 접근과 통계를 직접 구현해야 한다. 이미 이런 정책을 지원하는 Caffeine을 사용해 직접 관리할 코드를 줄였다.


## 엔티티 대신 불변 catalog를 캐시했다

처음에는 Repository로 지역과 분류 데이터를 조회한 뒤, 그 결과인 `List<RegionSido>`나 `List<PlaceTag>`를 그대로 캐시에 넣으려고 했다. 하지만 주소와 장소를 분류할 때 이 객체의 모든 값이 필요한 것은 아니었다. 실제로 사용하는 값은 지역명과 코드, 카테고리와 태그의 ID처럼 몇 가지뿐이었다.

JPA 엔티티를 캐시에 오래 보관하면 다루기도 까다롭다. 예를 들어 시군구 엔티티가 부모 시도를 `LAZY`로 가지고 있다면, DB 조회가 끝난 뒤 캐시에서 꺼내 부모 시도에 접근할 때 추가 조회를 실행하지 못해 오류가 날 수 있다. DB 값이 변경되어도 캐시에 저장된 엔티티가 자동으로 바뀌는 것도 아니다.

그래서 주소 해석과 분류에 필요한 값만 불변 record와 Map으로 복사해 catalog를 만들었다.

catalog를 만드는 Provider는 Resolver와 다른 Spring Bean으로 분리했다. 덕분에 호출이 Spring 프록시를 통과해 `@Cacheable`이 실제로 적용된다.

첫 요청은 지역과 분류 catalog를 만들기 위해 각각 2개의 쿼리를 실행한다. 그다음 요청부터는 DB를 다시 조회하지 않고 메모리의 catalog를 사용한다.

장소를 실제로 저장하면서 JPA 엔티티가 필요해지면, catalog에 보관한 ID로 `getReferenceById()`를 호출한다. 즉 캐시에는 분류에 필요한 가벼운 값만 두고, 엔티티 참조는 저장하는 순간에만 만든다.


## 쿼리 수는 어떻게 달라졌을까?

같은 입력을 반복 호출하고 Hibernate Statistics의 `prepareStatementCount`로 실행된 statement 수를 비교했다.

| 경로 | 개선 전 5회 | 개선 후 최초 1회 | 개선 후 추가 5회 | 동시 최초 8회 |
|---|---:|---:|---:|---:|
| 지역 주소 해석 | 10 | 2 | 0 | 2 |
| 장소 분류 | 10 | 2 | 0 | 2 |

개선 전에는 지역과 분류가 호출될 때마다 각각 2개의 statement를 실행했다. 그래서 5회 호출하면 각각 10개, 두 경로를 모두 사용하면 총 20개가 발생했다.

개선 후에는 최초 요청에서만 각 catalog를 만들기 위한 2개의 statement를 실행한다. 이후 5회 요청에서는 Caffeine에 저장된 catalog를 사용하므로 statement가 하나도 발생하지 않았다.

동시에 8개 요청이 처음 들어와도 결과는 같았다. `@Cacheable(sync = true)`가 같은 catalog의 생성을 한 번으로 합쳐 각 경로에서 2개의 statement만 실행됐다.


## 처음으로 K6 부하 테스트도 해보았다

지금까지는 API를 여러 번 순차 호출하거나 쿼리 실행 계획을 확인하는 방식으로 성능을 테스트했다.

이번에는 동시 요청에서도 캐시 효과가 유지되는지 보고 싶어서 처음으로 K6 부하 테스트를 시도해 보았다.

`grafana/k6:0.54.0` Docker 이미지를 사용했다.

아직 실제 운영 트래픽이 없어 DAU나 배포 서버 사양에서 목표 TPS를 계산할 근거는 없었다. 따라서 이번 테스트는 로컬에서 요청률을 단계적으로 50 TPS까지 높이며 변경 전후 차이와 동시 요청에서의 캐시 동작을 비교했다.

테스트 대상은 지역 주소 해석과 장소 분류를 모두 거치는 수동 장소 저장 API다. 따라서 아래 지연시간은 지역·분류 catalog 개선의 전후 결과이며, 앞에서 설명한 2초 링크 분석 캐시의 성능 측정값은 아니다.

```http
POST /api/v1/rooms/{roomId}/link-analysis-requests/{analysisRequestId}/places/manual
```

부하는 5 TPS로 15초, 25 TPS로 45초, 마지막에는 50 TPS로 30초를 주었다. HTTP 요청은 2초 안에 끝나도록 제한했고 p95 500ms, p99 1,000ms, dropped iteration 0개를 기준으로 잡았다.

| 지표 | 변경 전 | 개선 후 |
|---|---:|---:|
| 측정 요청 | 2,694 | 2,702 |
| 평균 | 563.736ms | 17.620ms |
| p95 | 1,122.020ms | 23.950ms |
| p99 | 1,160.805ms | 33.135ms |
| HTTP 실패율 | 0% | 0% |
| dropped iterations | 7 | 0 |

평균은 약 96.87%, p95는 약 97.87% 줄었다.

```text
before manual_place_save: count=2694 avg=563.736ms p95=1122.020ms p99=1160.805ms max=1975.090ms
after  manual_place_save: count=2702 avg=17.620ms  p95=23.950ms   p99=33.135ms   max=56.810ms
before dropped_iterations=7
after  dropped_iterations=0
```

변경 전에도 응답 실패는 없었다. 하지만 p95가 기준을 넘었고 요청 7개는 정해진 시점에 시작하지 못했다. 개선 후에는 모든 threshold를 통과했다.

이걸로 같은 로컬 환경과 부하 조건에서 기준정보 쿼리가 요청마다 반복되던 구조와 한 번 읽은 catalog를 재사용하는 구조의 차이를 확인할 수 있었다.


## 결론 - 結論なのだ！

이미 `@Cacheable`이 있으니 캐시가 적용되어 있다고 생각했다.

실제로 쿼리 수를 확인하지 않았다면 같은 데이터를 계속 조회하고 있다는 사실도 발견하지 못했을 것이다.

직접 만든 Map도 값을 저장하고 재사용한다는 좁은 의미에서는 캐시다. 하지만 운영에서 안전하게 쓰려면 값 저장 외에도 언제 만료하고, 최대 몇 개까지 보관하며, 데이터 변경 시 어떻게 비우고, 같은 key가 동시에 들어오면 몇 번 읽을지까지 정해야 한다. 이번에 Caffeine을 처음 사용하면서 기존 Map 구현에는 이런 수명주기와 메모리 상한 관리가 부족했다는 점을 알게 되었다.

K6로 처음 시도한 부하 테스트에서도 수동 장소 저장 API의 p95가 `1,122.020ms`에서 `23.950ms`로 줄고 dropped iteration이 7개에서 0개가 되는 것을 확인했다.

다만 로컬 캐시는 애플리케이션 인스턴스마다 따로 존재한다. 현재처럼 단일 인스턴스에서는 단순하고 빠르지만, 서버를 여러 대로 늘리면 한 인스턴스의 eviction이 다른 인스턴스에 전달되지 않는다. 그때에는 Redis 같은 공유 캐시나 변경 이벤트를 다시 검토해야 할 것이다.
