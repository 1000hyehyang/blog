---
{
  "title": "어디더라 고쳐쓰기 #03 데이트 코스 생성 병목 찾기",
  "category": {
    "name": "Development",
    "slug": "development"
  },
  "tags": [
    "Backend",
    "QueryDSL",
    "Hibernate",
    "JPA",
    "Projection",
    "Fetch Join",
    "Query Optimization",
    "EXPLAIN ANALYZE",
    "PostgreSQL"
  ],
  "excerpt": "어디더라에서는 방에 저장된 장소를 활용해 사용자가 선택한 카테고리 순서에 맞는 데이트 코스를 만들 수 있다. 단순히 데이트 코스를 일방적으로 추천하는 데 그치면 실제로 사용하지 않을 코스가 생성될 수 있다고 생각했다. 그래서 사용자가 원하는 카테고리와 순서를 직접 선택…",
  "coverImage": {
    "src": "https://images.unsplash.com/photo-1755502046743-78265e184cc3?q=80&w=2167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "featured": true,
  "featuredOrder": 1,
  "published": true,
  "slug": "post-3",
  "id": "post-3",
  "createdAt": "2026-08-03T13:24:05Z",
  "lastEditedAt": "2026-09-04T20:20:47Z",
  "commentsCount": 0,
  "reactionsCount": 0
}
---
어디더라에서는 방에 저장된 장소를 활용해 사용자가 선택한 카테고리 순서에 맞는 데이트 코스를 만들 수 있다.

단순히 데이트 코스를 일방적으로 추천하는 데 그치면 실제로 사용하지 않을 코스가 생성될 수 있다고 생각했다. 그래서 사용자가 원하는 카테고리와 순서를 직접 선택해 코스를 구성할 수 있도록 커스터마이징 기능을 추가했다.

![udidura-date](https://github.com/user-attachments/assets/e11f8c82-d5a9-43a7-a00c-68a5ef127af2)

```http
POST /api/v1/rooms/{roomId}/date-courses
```

데이트 코스를 추천하려면 조건에 맞는 장소를 모두 후보 풀에 담은 뒤, 영업시간과 거리, 저장 시점, 원본 링크의 인기도 등을 기준으로 후보를 평가해야 한다.

그렇다면 지난 글에서 다룬 장소 목록 조회 API보다 Room에 저장된 여러 장소를 한꺼번에 사용하는 데이트 코스 생성 API에서 병목이 발생할 가능성이 더 크지 않을까?

만약 저장된 장소를 모두 후보로 불러오는 구조 때문에 코스 생성 성능이 크게 저하된다면, Room의 장소 저장 상한을 설정해야 할 근거를 얻을 수 있을 것이다. 지난 글에서는 상한을 정할 만한 근거를 찾지 못했지만, 이번 테스트를 통해 적절한 상한을 다시 검토해 볼 수 있다고 생각했다.


# 기존 코드는 어떻게 후보를 찾고 있었을까?

데이트 코스 생성은 본인이 작업한 부분이 아니었기 때문에, 기존에는 동작 여부만 확인하고 내부 조회 구조까지 자세히 살펴보지 못했다. 이번 리팩토링을 진행하면서 후보가 늘어날 때 이 구조가 어떤 비용을 만드는지 직접 확인해 보기로 했다.

기존 후보 조회 쿼리를 단순화하면 다음과 같다.

```java
return queryFactory
    .selectFrom(ROOM_PLACE)
    .distinct()
    .join(ROOM_PLACE.place, PLACE).fetchJoin()
    .join(PLACE.serviceCategory, CATEGORY).fetchJoin()
    .join(PLACE.serviceTag, TAG).fetchJoin()
    .leftJoin(ROOM_PLACE.originRoomLink, ORIGIN_ROOM_LINK).fetchJoin()
    .leftJoin(ORIGIN_ROOM_LINK.link, ORIGIN_LINK).fetchJoin()
    .join(PBH).on(
        PBH.kakaoPlaceId.eq(PLACE.kakaoPlaceId),
        PBH.businessHoursStatus.eq(SUCCEEDED),
        PBH.businessHoursExpiresAt.after(now)
    )
    .where(/* Room, 지역, 카테고리 조건 */)
    .orderBy(ROOM_PLACE.createdAt.desc(), ROOM_PLACE.id.desc())
    .fetch();
```

한 번의 쿼리에서 `RoomPlace`, `Place`, `PlaceCategory`, `PlaceTag`, `RoomLink`, `Link`를 모두 fetch join한다.

영업시간 테이블도 이미 join하지만 `businessHoursJson`은 선택하지 않는다. 유효한 영업시간 캐시가 있는지만 확인한 뒤, 후보의 카카오 장소 ID를 모아 같은 테이블을 다시 조회한다.

```java
List<String> kakaoPlaceIds = roomPlaces.stream()
    .map(RoomPlace::getKakaoPlaceId)
    .distinct()
    .toList();

placeBusinessHoursRepository.findByKakaoPlaceIdIn(kakaoPlaceIds);
```

즉 흐름은 다음과 같았다.

```text
넓은 fetch join으로 후보 전체 조회
        ↓
후보 ID 전체 수집
        ↓
큰 IN 조건으로 영업시간 다시 조회
        ↓
모든 영업시간 JSON 파싱
        ↓
열려 있는 장소만 후보 풀에 추가
```

후보가 적을 때는 크게 티가 나지 않는다. 실제로 장소 100개 정도 넣고 테스트했을 때에는 큰 성능 문제를 전혀 느끼지 못했다!

하지만 10,000개라면 후보 수만큼 `RoomPlace`와 `Place`를 조회하고, 10,000개의 ID로 영업시간을 다시 조회한 뒤, 10,000개의 JSON을 확인해야 한다...!

목록 조회는 LIMIT 21로 애플리케이션에 전달되는 데이터가 제한되지만, 코스 생성은 조건을 만족하는 모든 장소를 한꺼번에 조회하고 메모리에서 평가하는 구조였다.


## 테스트 조건

테스트 조건은 다음과 같다.

- PostgreSQL 17.8 Docker
- 로컬 Spring Boot 애플리케이션
- 한 Room에 FOOD / KOREAN, sigunguCode=11440인 장소 저장
- 모든 장소에 아직 만료되지 않은 SUCCEEDED 영업시간 캐시 저장
- 월요일 21시(KST)에 영업 중인 장소로 요청
- 각 구간에서 워밍업 3회
- 이후 API 20회 순차 호출
- p50, p95, 최댓값 기록
- EXPLAIN (ANALYZE, BUFFERS)는 7회 실행 후 실행 시간의 중앙값 사용
- DB와 애플리케이션, 측정 스크립트는 같은 PC에서 실행

API 측정값은 PowerShell 스크립트가 HTTP 요청을 보내고 응답을 받을 때까지 기록한 전체 경과 시간이다.

요청 본문은 다음과 같다.

```json
{
  "categorySequence": [
    {
      "categoryCode": "FOOD",
      "tagCode": "KOREAN"
    }
  ],
  "startDateTime": "2026-08-03T12:00:00Z",
  "endDateTime": "2026-08-03T14:00:00Z",
  "sigunguCode": "11440"
}
```

## AS-IS 측정 결과

먼저 기존 코드를 그대로 측정했다.

### DB 쿼리

| 후보 수 | 후보 fetch join | 영업시간 재조회 | 두 쿼리 합계 |
| ---: | ---: | ---: | ---: |
| 200 | 1.306ms | 0.256ms | 1.562ms |
| 1,000 | 4.832ms | 0.770ms | 5.602ms |
| 10,000 | 51.984ms | 7.390ms | 59.374ms |

10,000건에서도 DB 실행 시간만 보면 1초까지 느려지지는 않았다.

### 전체 API

| 후보 수 | p50 | p95 | 최대 |
| ---: | ---: | ---: | ---: |
| 200 | 53.43ms | 58.77ms | 65.09ms |
| 1,000 | 150.96ms | 172.25ms | 181.96ms |
| 10,000 | 1,122.66ms | 1,215.85ms | 1,316.75ms |

후보가 10,000개일 때 p50은 약 1.12초였다. DB에서 두 쿼리를 실행한 약 59ms를 제외해도 1초가량이 남는다.

DB 실행 시간만으로 전체 API 시간을 설명할 수는 없었다. 본인은 다음 작업들이 그 차이에 포함됐을 것으로 보았다.

- Hibernate가 넓은 엔티티 그래프 10,000개를 만드는 비용
- 10,000개의 카카오 장소 ID를 수집하는 비용
- 두 번째 `IN (...)` 조건을 만들고 결과를 다시 엔티티로 만드는 비용
- 영업시간 JSON 10,000개를 파싱하고 판정하는 비용
- 추천 점수를 계산하기 위한 전체 후보 순회

이번 테스트에서는 이 작업들을 프로파일러로 각각 분리해 측정하지 않았다.

따라서 Hibernate의 엔티티 조립이나 JSON 파싱 중 하나가 1초를 전부 차지했다고 말할 수는 없다. 다만 SQL만 빠르게 만드는 것으로는 충분하지 않고, 애플리케이션으로 전달하는 데이터와 생성하는 객체까지 함께 줄여야 한다는 방향은 분명해 보였다.

전체 API 측정과 함께 기존 후보 쿼리의 실행 계획도 살펴보았다.

```text
Unique
  -> Sort
       actual rows=10000 loops=1
       width ≈ 5KB
       Sort Key: created_at, id,
                 RoomPlace, Place, Category, Tag, RoomLink, Link의 선택 컬럼
       Sort Method: external merge  Disk: 5848kB
Execution Time: 51.984ms
```

쿼리에서는 실제로 후보 10,000행이 반환됐다.

특히 `DISTINCT`를 처리하기 위해 최신순 정렬에 필요한 `created_at`, `id`뿐 아니라 fetch join으로 선택한 여러 컬럼이 정렬 대상에 포함되어 있었다.

한 행의 예상 폭은 약 5KB였고, 정렬은 메모리를 넘어 임시 디스크를 사용했다.

즉, 후보 10,000개에 대해 사용하지 않는 컬럼까지 포함한 넓은 행을 만들고 정렬하고 있으니까... 느려지는 게 아닐까..

# 이제 개선해보자

의심되는 부분을 한 번에 모두 바꾸기보다 하나씩 제거하면서, 후보 10,000건을 기준으로 실행 계획과 실행 시간이 어떻게 달라지는지 다시 측정해 보기로 했다.

## DISTINCT 제거하기

기존 쿼리에는 `distinct()`가 있었다.

그런데 현재 join 관계를 다시 확인해 보니 후보 한 개가 여러 행으로 늘어날 이유가 없었다.

- `RoomPlace → Place`: 다대일
- `Place → Category`: 다대일
- `Place → Tag`: 다대일
- `RoomPlace → OriginRoomLink`: 다대일
- `RoomLink → Link`: 다대일
- `PlaceBusinessHours.kakaoPlaceId`: unique

모두 한 후보에서 최대 한 행만 연결된다.

10,000건에서 `DISTINCT`만 제거해 보았다.

```text
AS-IS DISTINCT 포함     51.984ms
DISTINCT 제거           42.564ms
```

약 18% 줄었다.

불필요한 `DISTINCT`가 실제 비용을 만들고 있었던 것은 맞았다.

하지만 이것만으로 애플리케이션의 두 번째 영업시간 조회와 엔티티 조립 비용이 사라지지는 않는다.


## 영업시간을 첫 쿼리에서 같이 가져오면 어떨까?

이미 첫 쿼리에서 `place_business_hours`를 join하고 있었다. 요청 시각에 영업 중인지를 판정하는 조건이 아니라, 조회에 성공했고 아직 만료되지 않은 영업시간 캐시가 존재하는지만 확인했다. 실제 영업 여부를 판단하려면 캐시에 저장된 JSON을 가져와 요청 시각과 비교해야 한다.

그런데 join한 행의 영업시간 JSON은 가져오지 않고, 장소 ID를 모아 같은 테이블을 다시 조회했다.

그래서 첫 쿼리에서 영업시간까지 함께 선택해 보았다.

```text
DISTINCT 제거 + 영업시간 단일 조회: 45.714ms
```

DISTINCT만 제거했을 때보다는 실행 시간이 조금 늘었다.

첫 번째 조회 결과에 `businessHoursJson` 컬럼이 추가되었기 때문이다.

그래도 기존 두 쿼리의 중앙값을 단순히 더한 약 59.4ms보다는 줄었고, 두 번째 DB 왕복과 10,000개의 값이 들어가는 큰 `IN` 조건도 없앨 수 있었다.

애플리케이션에서 후보의 카카오 장소 ID를 따로 모으고, `PlaceBusinessHours` 엔티티를 다시 만들 필요도 없어졌다.

하지만 모든 연관 엔티티를 fetch join하면 여전히 한 행의 폭이 컸다.

후보를 고르는 동안 정말 이 모든 컬럼이 필요할까?


## 필요한 값만 projection하면 어떨까?

추천 단계에서 실제로 사용하는 값만 정리해 보았다.

- 선택된 장소를 저장하기 위한 `RoomPlace` 참조
- 카테고리 코드와 태그 코드
- 위도와 경도
- Room에 저장된 시각
- 원본 링크 존재 여부
- 링크 유형과 좋아요 수
- 영업시간 JSON

장소의 이름, 주소, 전화번호, 링크의 본문과 분석 결과 같은 큰 컬럼은 후보를 고르는 동안 사용하지 않는다.

그래서 `RoomPlace`는 나중에 선택된 장소를 저장하기 위한 참조로만 유지하고, 나머지는 필요한 스칼라 값만 projection하도록 바꾸었다.

10,000건에서 결과는 다음과 같았다.

```text
넓은 fetch join + DISTINCT   51.984ms
가벼운 projection           32.082ms
```

실행 계획에 표시된 예상 행 폭은 약 5KB에서 약 509B로 줄었다.

정렬도 임시 디스크가 아니라 메모리에서 끝났다.

```text
Sort Method: quicksort  Memory: 2653kB
```

DB 실행 시간뿐 아니라 Hibernate가 후보마다 조립해야 하는 연관 엔티티 수도 줄어든다.

변경 후에도 `RoomPlace`는 후보 수만큼 조회한다. 다만 후보 선정에 사용하지 않는 `Place` 엔티티 전체를 fetch join할 필요가 없어졌고, 별도 쿼리에서 `PlaceBusinessHours` 엔티티를 다시 만들 필요도 없어졌다. 테스트 데이터에서 모든 장소가 공유한 `Category`와 `Tag`는 코드 값만 가져오고, 원본 링크가 있는 경우에도 후보 평가에 필요한 링크 유형과 좋아요 수만 선택한다.


## projection 기반 쿼리로 변경하기

후보 저장소가 무거운 엔티티 목록 대신 가벼운 projection을 반환하도록 바꾸었다.

```java
public record DateCourseCandidate(
    RoomPlace roomPlace,
    String categoryCode,
    String tagCode,
    BigDecimal latitude,
    BigDecimal longitude,
    Instant createdAt,
    LinkSourceType linkSourceType,
    Long likeCount,
    boolean hasOriginLink,
    String businessHoursJson
) {
}
```

QueryDSL에서는 `DISTINCT`와 fetch join을 제거하고 필요한 필드만 선택했다.

```java
queryFactory
    .select(
        ROOM_PLACE,
        CATEGORY.code,
        TAG.code,
        PLACE.latitude,
        PLACE.longitude,
        ROOM_PLACE.createdAt,
        ORIGIN_LINK.linkSourceType,
        ORIGIN_LINK.likeCount,
        ROOM_PLACE.originRoomLink.isNotNull(),
        PBH.businessHoursJson
    )
    .from(ROOM_PLACE)
    .join(ROOM_PLACE.place, PLACE)
    .join(PLACE.serviceCategory, CATEGORY)
    .join(PLACE.serviceTag, TAG)
    .leftJoin(ROOM_PLACE.originRoomLink, ORIGIN_ROOM_LINK)
    .leftJoin(ORIGIN_ROOM_LINK.link, ORIGIN_LINK)
    .join(PBH).on(/* 유효한 영업시간 조건 */)
    .where(/* Room, 지역, 카테고리 조건 */)
    .orderBy(ROOM_PLACE.createdAt.desc(), ROOM_PLACE.id.desc())
    .fetch();
```

`AvailablePoolBuilder`의 두 번째 조회도 사라졌다.

```java
List<AvailableCandidate> candidates = rows.stream()
    .filter(row -> row.businessHoursJson() != null)
    .filter(row -> businessHoursAtTimeChecker.isOpenAt(
        row.businessHoursJson(),
        startDateTime
    ))
    .map(AvailableCandidate::from)
    .toList();
```

추천 점수 계산도 연관 엔티티를 따라가지 않고 projection 값을 사용한다.


## 실행 계획은 어떻게 달라졌을까?

변경한 쿼리도 같은 데이터에서 EXPLAIN (ANALYZE, BUFFERS)로 다시 확인했다.

```text
Sort
  actual rows=10000 loops=1
  width ≈ 509B
  Sort Key: created_at DESC, id DESC
  Sort Method: quicksort  Memory: 2653kB
Execution Time: 32.082ms
```

`join` 자체와 최종 반환 행 수는 그대로였다.

후보 10,000개를 모두 평가한다는 동작도 바뀌지 않았다.

달라진 것은 한 행의 폭과 정렬 대상이었다.

AS-IS에서는 약 5KB의 넓은 행에 대해 `DISTINCT` 처리를 위한 정렬이 발생했고, 임시 디스크까지 사용했다.

TO-BE에서는 예상 행 폭이 약 509B로 줄었고, 정렬 키도 최신순 정렬에 필요한 `created_at`, `id`만 남았다.

그 결과 임시 디스크를 사용하지 않고 메모리의 quicksort로 정렬이 끝났다.

같은 10,000행을 조회하면서 불필요하게 넓은 데이터를 만들고 정렬하고, 중복 제거하던 비용을 줄인 결과다.

## TO-BE 측정 결과

| 후보 수 | AS-IS p50 | TO-BE p50 | 변화 |
| ---: | ---: | ---: | ---: |
| 200 | 53.43ms | 26.58ms | 50.3% 감소 |
| 1,000 | 150.96ms | 37.85ms | 74.9% 감소 |
| 10,000 | 1,122.66ms | 141.48ms | 87.4% 감소 |

p95도 함께 비교했다.

| 후보 수 | AS-IS p95 | TO-BE p95 | 변화 |
| ---: | ---: | ---: | ---: |
| 200 | 58.77ms | 42.84ms | 27.1% 감소 |
| 1,000 | 172.25ms | 43.98ms | 74.5% 감소 |
| 10,000 | 1,215.85ms | 187.18ms | 84.6% 감소 |

후보가 많을수록 차이가 커졌다.

200건에서는 약 27ms를 줄였지만 10,000건에서는 p50 기준 약 981ms를 줄였다.

불필요한 객체를 후보 수만큼 만들던 구조였기 때문에 데이터가 많아질수록 개선 효과도 커졌다.

물론 10,000건에서 141ms가 모든 환경에서 충분하다는 뜻은 아니다.

이번 테스트는 로컬 단일 요청이고, 동시 부하나 운영 서버의 CPU와 메모리 상황은 포함하지 않았다. 모든 영업시간 JSON을 파싱하는 비용도 여전히 후보 수에 비례한다.

다만 조회와 객체 조립 구조를 먼저 개선할 수 있었다.


## LIMIT을 추가하지 않은 이유

가장 간단한 방법은 후보를 200개나 500개로 잘라 버리는 것이다.

하지만 후보 조회의 정렬 기준은 최신 저장 순서다.

여기에 무조건 `LIMIT`을 추가하면 오래전에 저장한 장소는 추천 후보가 될 기회를 잃는다. 인기 코스와 거리 기반 추천의 후보 분포도 달라진다.

이렇게 되면 우리가 의도했던 기획과 멀어진다. 따라서 LIMIT는 추가하지 않기로 했다.


## 그래서... 장소 수 제한은 필요할까?

이번 결과만으로 Room 장소 수를 제한해야 한다는 근거는 더 약해졌다.

목록 조회는 10,000건에서도 안정적이었고, 코스 생성의 가장 큰 병목도 후보 수 제한 없이 줄일 수 있었다.

그렇다고 제한이 없어도 되고, 제한이 없는 게 항상 안전하다는 뜻도 아니다.

- 영업시간 JSON 판정은 아직 후보 수에 비례한다.
- 저장 공간, 백업, VACUUM 비용은 데이터와 함께 증가한다.
- 동시 코스 생성 요청은 이번에 측정하지 않았다.
- 지도 조회나 내 장소 검색 같은 다른 기능은 별도 실행 계획을 가진다.
- 실제 사용자가 한 Room에 몇 개까지 저장하는지는 운영 지표로 확인해야 한다.

그러니까 현재까지의 결론은 이 정도다.

> 정책적으로 풀어나가야 되는 지점이다!


본인의 전후 측정에서 가장 큰 차이를 만든 변경은 이미 join한 영업시간을 다시 조회하지 않고, 후보 평가에 사용하지 않을 연관 엔티티 전체를 fetch join하지 않는 것이었다.

EXPLAIN은 기존 후보 쿼리의 DB 실행 시간이 약 52ms였다는 것을 보여 주었다.

반면 API 측정은 DB 실행 시간만으로 전체 응답 시간을 설명할 수 없으며, 결과 전송과 Hibernate의 엔티티 조립, 두 번째 조회, 영업시간 판정과 후보 순회가 포함된 구간에도 큰 비용이 있음을 보여 주었다.
