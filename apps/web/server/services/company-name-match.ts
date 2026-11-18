import { sql, type SQL } from "drizzle-orm"

/** Symmetric overlap: adding a location does not hide an existing company name. */
export function similarCompanyName(candidate: string, existingName: SQL): SQL {
  const tokens = (name: SQL) => sql`ARRAY(SELECT DISTINCT word FROM unnest(regexp_split_to_array(lower(${name}), '[^a-z0-9]+')) AS word WHERE length(word)>1 AND word NOT IN ('sdn','bhd','berhad','sendirian','pte','ltd','limited','inc','llc'))`
  return sql`EXISTS (
    SELECT 1 FROM (SELECT ${tokens(sql`${candidate}`)} AS incoming, ${tokens(existingName)} AS existing) names
    CROSS JOIN LATERAL (SELECT count(*) AS shared FROM unnest(incoming) word WHERE word=ANY(existing)) overlap
    WHERE cardinality(incoming)>0 AND cardinality(existing)>0 AND (
      (cardinality(incoming)=1 AND cardinality(existing)=1 AND overlap.shared=1)
      OR (overlap.shared>=2 AND overlap.shared>=ceil(least(cardinality(incoming),cardinality(existing))*0.8))
    )
  )`
}
