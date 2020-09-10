docker exec -i orm-comparison_database_1 psql -U pagila --password pagila -v -d pagila < ./pagila-master/pagila-schema.sql
docker exec -i orm-comparison_database_1 psql -U pagila --password pagila -v -d pagila < ./pagila-master/pagila-data.sql
