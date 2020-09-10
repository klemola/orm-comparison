import Knex from "knex"
import { Model } from "objection"

type MPAARating = "G" | "PG" | "PG-13" | "R" | "NC-17"

class Film extends Model {
  film_id!: number
  title!: string
  description!: string
  release_year!: number // with constraint of value between 1901 and 2155
  rental_duration!: number
  rental_rate!: number
  length!: number
  mpaa_rating!: MPAARating
  special_features!: string[]
  last_update!: string // timestamp

  static tableName = "film"
  static idColumn = "film_id"
}

class Actor extends Model {
  actor_id!: number
  first_name!: string
  last_name!: string
  last_update!: string // timestamp

  films?: Film[]

  static tableName = "actor"
  static idColumn = "actor_id"

  static relationMappings = () => ({
    films: {
      relation: Model.ManyToManyRelation,
      modelClass: Film,
      join: {
        from: "actor.actor_id",
        through: {
          from: "film_actor.actor_id",
          to: "film_actor.film_id",
        },
        to: "film.film_id",
      },
    },
  })
}

class Customer extends Model {
  customer_id!: number
  first_name!: string
  last_name!: string
  email!: string
  activebool!: boolean
  create_date!: Date
  active!: number
  last_update!: string // timestamp

  static tableName = "customer"
  static idColumn = "customer_id"

  static relationMappings = () => ({
    rentals: {
      relation: Model.HasManyRelation,
      modelClass: Rental,
      join: {
        from: "customer.customer_id",
        to: "rental.customer_id",
      },
    },
    address: {
      relation: Model.HasOneRelation,
      modelClass: Address,
      join: {
        from: "customer.address_id",
        to: "address.address_id",
      },
    },
  })
}

class Address extends Model {
  address_id!: number
  address!: string
  address2!: string | null
  district!: string
  postal_code!: string | null
  phone!: string
  last_update!: string // timestamp

  static tableName = "address"
  static idColumn = "address_id"

  // relations
  city_id!: number
}

class Rental extends Model {
  rental_id!: number
  rental_date!: string // timestamp
  return_date!: string // timestamp
  last_update!: string // timestamp

  static tableName = "rental"
  static idColumn = "rental_id"

  static relationMappings = () => ({
    customer: {
      relation: Model.HasOneRelation,
      modelClass: Customer,
      join: {
        from: "rental.customer_id",
        to: "customer.customer_id",
      },
    },
    film: {
      relation: Model.HasOneThroughRelation,
      modelClass: Film,
      join: {
        from: "rental.inventory_id",
        through: {
          // persons_movies is the join table.
          from: "inventory.film_id",
          to: "film.film_id",
        },
        to: "film.film_id",
      },
    },
  })

  // relations
  staff_id!: number
}

class Inventory extends Model {
  inventory_id!: number
  last_update!: string // timestamp

  static tableName = "inventory"
  static idColumn = "inventory_id"

  static relationMappings = () => ({
    rentals: {
      relation: Model.HasManyRelation,
      modelClass: Rental,
      join: {
        from: "inventory.inventory_id",
        to: "rental.rental_id",
      },
    },
    film: {
      relation: Model.HasOneRelation,
      modelClass: Film,
      join: {
        from: "inventory.film_id",
        to: "film.film_id",
      },
    },
  })
}

class Store extends Model {
  store_id!: number
  manager_staff_id!: number
  last_update!: string // timestamp

  static tableName = "store"
  static idColumn = "store_id"

  static relationMappings = () => ({
    rentals: {
      relation: Model.HasManyRelation,
      modelClass: Customer,
      join: {
        from: "store.store_id",
        to: "customer.customer_id",
      },
    },
    address: {
      relation: Model.HasOneRelation,
      modelClass: Address,
      join: {
        from: "store.address_id",
        to: "address.address_id",
      },
    },
  })
}

const knex = Knex({
  client: "postgresql",
  connection: {
    database: "pagila",
    user: "pagila",
    password: "pagila",
  },
  pool: {
    min: 2,
    max: 10,
  },
})
Model.knex(knex)

function overdueDVDs() {
  /*
  From: https://dev.mysql.com/doc/sakila/en/sakila-usage.html

  SELECT CONCAT(customer.last_name, ', ', customer.first_name) AS customer,
    address.phone, film.title
  FROM rental INNER JOIN customer ON rental.customer_id = customer.customer_id
  INNER JOIN address ON customer.address_id = address.address_id
  INNER JOIN inventory ON rental.inventory_id = inventory.inventory_id
  INNER JOIN film ON inventory.film_id = film.film_id
  WHERE rental.return_date IS NULL
  AND rental_date + INTERVAL film.rental_duration DAY < CURRENT_DATE()
  ORDER BY title
  LIMIT 5;

  +----------------+--------------+------------------+
  | customer       | phone        | title            |
  +----------------+--------------+------------------+
  | OLVERA, DWAYNE | 62127829280  | ACADEMY DINOSAUR |
  | HUEY, BRANDON  | 99883471275  | ACE GOLDFINGER   |
  | OWENS, CARMEN  | 272234298332 | AFFAIR PREJUDICE |
  | HANNON, SETH   | 864392582257 | AFRICAN EGG      |
  | COLE, TRACY    | 371490777743 | ALI FOREVER      |
  +----------------+--------------+------------------+
  */

  return Rental.query()
    .select(
      "customer.first_name",
      "customer.last_name",
      "address.phone",
      "film.title"
    )
    .joinRelated("customer")
    .innerJoin("address", "customer.address_id", "address.address_id")
    .innerJoin("inventory", "rental.inventory_id", "inventory.inventory_id")
    .innerJoin("film", "inventory.film_id", "film.film_id")
    .where("rental.return_date", null)
    .andWhereRaw(
      "rental.rental_date + INTERVAL '1 day' * film.rental_duration < CURRENT_DATE"
    )
    .orderBy("film.title")
    .limit(5)
}

async function main() {
  const actor = await Actor.query().findById(1)

  const films = await actor
    .$relatedQuery("films")
    .where("release_year", 2006)
    .orderBy("length", "desc")
    .limit(3)

  const filmsCount = await Film.query().count()

  const inventory = await Inventory.query()
    .where("film_id", "<", "500")
    .orderBy("film_id", "desc")
    .limit(5)

  console.log(films)
  console.log(filmsCount)
  console.log(inventory)
  console.log(await overdueDVDs())
}

main()
  .then(() => knex.destroy())
  .catch((err) => {
    console.error(err)
    return knex.destroy()
  })
