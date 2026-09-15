---
{
  "title": "어디더라 고쳐쓰기 #06 트래픽 없이 병목 미리 찾기",
  "category": {
    "name": "Development",
    "slug": "development"
  },
  "tags": [
    "PostgreSQL",
    "EXPLAIN ANALYZE",
    "Partial Index",
    "Index Only Scan"
  ],
  "excerpt": "현재 데이터 규모에서는 문제가 드러나지 않지만, 주기적으로 실행되면서 누적 데이터를 탐색하는 쿼리는 데이터가 쌓일수록 병목이 될 수 있다. 어디더라는 링크와 분석 요청을 DB에 먼저 저장한 뒤, 트랜잭션이 커밋되면 비동기 executor를 통해 Processing Se…",
  "coverImage": {
    "src": "https://images.unsplash.com/photo-1755502046743-78265e184cc3?q=80&w=2167&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  "featured": true,
  "featuredOrder": 1,
  "published": true,
  "slug": "post-6",
  "id": "post-6",
  "createdAt": "2026-08-23T10:47:22Z",
  "lastEditedAt": "2026-09-04T20:20:51Z",
  "commentsCount": 0,
  "reactionsCount": 0
}
---
현재 데이터 규모에서는 문제가 드러나지 않지만, 주기적으로 실행되면서 누적 데이터를 탐색하는 쿼리는 데이터가 쌓일수록 병목이 될 수 있다.

어디더라는 링크와 분석 요청을 DB에 먼저 저장한 뒤, 트랜잭션이 커밋되면 비동기 executor를 통해 Processing Server에 분석 작업을 생성한다. 외부 서버가 느려져도 최초 API 응답을 오래 붙잡지 않기 위한 구조다.

여기에는 DB 커밋과 외부 작업 생성 사이의 간격이 있다. 이때 서버가 종료되거나 executor 큐가 가득 차 작업이 거절되면, DB에는 분석 요청이 남지만 Processing Server에는 작업이 생성되지 않을 수 있다. 인메모리 이벤트는 재시작 후 복원되지 않으므로 DB 상태를 기준으로 누락된 요청을 다시 찾아야 한다.

복구 스케줄러는 60초마다 다음 조건을 만족하는 링크를 오래된 순서대로 최대 50건 조회한다.

```sql
WHERE status = 'REQUESTED'
  AND dispatch_status IN ('PENDING', 'DISPATCHING')
  AND processing_job_id IS NULL
  AND updated_at <= :nowMinusTwoMinutes
ORDER BY updated_at, id
LIMIT :capacityAwareBatchSize;
```

전송을 마쳐 `processing_job_id`가 저장된 링크는 대상에서 제외된다. 즉 모든 링크를 반복 처리하는 것이 아니라, 2분 이상 진행되지 않은 요청만 복구한다.

## 무엇을 근거로 측정했나

실제 운영 데이터는 없다. 대신 현재 쿼리의 데이터 증가 경향을 확인할 수 있도록 다음 조건으로 격리된 벤치마크를 구성했다.

| 항목 | 조건 |
|---|---|
| DB | 로컬 Docker `postgres:17-alpine` |
| 링크 | 1,000,000건 |
| 복구 후보 | 100건 중 cutoff를 지난 95건 |
| 반환 크기 | 오래된 순서로 50건 |
| 실행 계획 | `EXPLAIN (ANALYZE, BUFFERS)` |
| 병렬 실행 | `max_parallel_workers_per_gather=0` |

## 기존 계획은 무엇이 문제였나

기존에는 복구 조건을 지원하는 인덱스가 없었다. PostgreSQL은 95건을 찾기 위해 100만 건 전체를 순차 탐색했다.

```text
Seq Scan → quicksort
Rows Removed by Filter: 999,905
Buffers: shared hit=9,346
Execution Time: 30.659 ms
```

실행 시간이 한 번에 30ms니까 그리 문제라고 생각되진 않는다. 하지만 문제는 **복구 대상은 0.01%뿐인데 전체 데이터를 반복해서 읽는 구조**다.

## 왜 부분 인덱스를 선택했나

완료된 링크에는 `processing_job_id`가 있으므로 복구 대상이 될 수 없다. 전체 링크를 인덱스에 넣는 대신, 작업 ID가 없는 소수 행만 보관하는 부분 인덱스를 검증했다.

```sql
CREATE INDEX CONCURRENTLY idx_links_dispatch_recovery
ON links (status, dispatch_status, updated_at, id)
WHERE processing_job_id IS NULL;
```

컬럼 순서에도 쿼리 조건을 반영했다.

1. `status`, `dispatch_status`: 동등·`IN` 조건으로 복구 상태를 먼저 좁힌다.
2. `updated_at`: 2분 cutoff와 오래된 작업 우선순위에 사용한다.
3. `id`: 시간이 같은 경우에도 순서를 고정한다.

## 실행 계획은 어떻게 달라졌나

인덱스를 추가한 격리 벤치마크에서는 전체 순차 탐색 대신 95개 후보를 인덱스에서 찾았다.

```text
Index Only Scan using idx_links_dispatch_recovery → quicksort
Candidate Rows: 95
Heap Fetches: 95
Buffers: shared hit=95 read=1
Execution Time: 0.158 ms
Index Size: 16 kB
```

| 지표 | 적용 전 | 적용 후 | 변화 |
|---|---:|---:|---:|
| 실행 시간 | 30.659ms | 0.158ms | 99.5% 감소 |
| 버퍼 접근 | 9,346 | 96 | 99.0% 감소 |
| 후보 탐색 범위 | 1,000,000건 | 95건 | 전체 탐색 제거 |
| 추가 인덱스 크기 | - | 16 kB | 복구 후보만 저장 |

정렬할 95건을 찾기 위해 100만 건을 읽던 경로를 없앴다.
