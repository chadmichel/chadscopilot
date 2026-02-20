import { QueryOptions, QueryResult, QueryResultItem } from '../components/common-dto/query.dto';

/**
 * Apply common QueryOptions (take/skip/filter) to an in-memory QueryResult.
 * This is used for offline/cache-forward flows where we keep the full dataset locally.
 */
export function applyQueryOptions<T>(
  result: QueryResult<T>,
  query: QueryOptions
): QueryResult<T> {
  const take = query.take ?? result.take ?? 10;
  const skip = query.skip ?? result.skip ?? 0;
  const filter = (query.filter || '').toLowerCase().trim();

  let items = (result.items || []) as QueryResultItem<T>[];

  if (filter) {
    items = items.filter((it) =>
      JSON.stringify(it.item || {})
        .toLowerCase()
        .includes(filter)
    );
  }

  const paged = items.slice(skip, skip + take);
  return {
    items: paged,
    total: items.length,
    skip,
    take,
  };
}

