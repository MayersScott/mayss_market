import sys
from app.services import search_service

query = sys.argv[1] if len(sys.argv) > 1 else "спортивная обувь"

qvec = search_service.embed_query(query)
es = search_service._get_es()
resp = es.search(
    index="mayss_products",
    size=15,
    knn={
        "field": "embedding",
        "query_vector": qvec,
        "k": 30,
        "num_candidates": 50,
        "filter": [{"term": {"status": "active"}}],
        "boost": 0.7,
    },
    query={
        "bool": {
            "must": [
                {
                    "multi_match": {
                        "query": query,
                        "fields": ["title^3", "description", "brand", "category_name"],
                        "fuzziness": "AUTO",
                    }
                }
            ],
            "filter": [{"term": {"status": "active"}}],
            "boost": 0.3,
        }
    },
)
print(f"Query: {query!r}")
for h in resp["hits"]["hits"]:
    print(f"{h['_score']:.3f}  {h['_source']['title']}")
