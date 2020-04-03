# TypeORM GraphQL Relation Loader

A dataloader for TypeORM that makes it easy to load TypeORM relations for
GraphQL query resolvers.


[![npm version](https://badge.fury.io/js/%40mando75%2Ftypeorm-graphql-loader.svg)](https://badge.fury.io/js/%40mando75%2Ftypeorm-graphql-loader)
![npm](https://img.shields.io/npm/dm/@mando75/typeorm-graphql-loader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pipeline status](https://gitlab.com/Mando75/typeorm-graphql-loader/badges/master/pipeline.svg)](https://gitlab.com/Mando75/typeorm-graphql-loader/commits/master)

## Contents

- [Description](#Description)
- [Installation](#Installation)
- [Usage](#Usage)
- [Gotchas](#Gotchas)
- [Roadmap](#Roadmap)
- [API](#API)
- [Contributing](#Contributing)
- [Problem](#Problem)
- [Solution](#Solution)
- [Acknowledgments](#Acknowledgments)

## Description <a name="Description">

This package provides a `GraphQLDatabaseLoader` class, which is a caching
loader that will trace through a GraphQL query info object and naively load the
TypeORM fields and relations needed to resolve the query. For a more in-depth
explanation, see the [Problem](#Problem) and [Solution](#Solution) sections below.

## Installation <a name="Installation">

```bash
yarn add @mando75/typeorm-graphql-loader

# OR

npm install @mando75/typeorm-graphql-loader
```

This package requires that you have TypeORM installed as a peer dependency

## Usage <a name="Usage">

You should create a new GraphQLDatabaseLoader instance in each user session,
generally via the GraphQLContext object. This is to help with caching and
prevent user data from leaking between requests. The constructor takes a TypeORM
connection as the first argument, and a GraphQLDatabaseLoaderOptions type as an
optional second parameter.

```ts
import { GraphQLDatabaseLoader } from '@mando75/typeorm-graphql-loader';
const connection = createConnection({...}); // Create your TypeORM connection

const apolloServer = new ApolloServer({
  schema,
  context: {
    loader: new GraphQLDatabaseLoader(connection, {/** additional options if needed**})
  },
});
```

The loader will now appear in your resolver's context object:

```ts
Query: {
    getBookById(object: any, args: {id: string }, context: MyGraphQLContext, info: GraphQLResolveInfo) {
        return context.loader
            .loadEntity(Book)
            .where({id})
            .info(info)
            .loadOne();
    }
}
```

Please note that the loader will only return back the fields and relations that
the client requested in the query. If you need to ensure that certain fields are
always returned, you can specify this using the `selectFields` method on the query builder.

## Gotchas <a name="Gotchas">

Because this package reads which relations and fields to load from the GraphQL query info object, the loader only works if your schema field names match your TypeORM entity field names. If it cannot find a requested GraphQL query field, it will not return it. In this case, you will need to provide a custom resolver for that field in your GraphQL resolvers file. In this case, the loader will provide the resolver function with an `object` parameter which is an entity loaded with whichever other fields your query requested. The loader will always return an object with at least the id (primary key) field loaded, so basic method calls should be possible. You can specify what your id field is called in the LoaderOptions upon loader initialization. That does require a uniform primary key naming strategy for your entire database schema. Be aware that you may need to reload the entity or provide some fields to the `selectFields` method for entity methods to work properly as not every entity database field is guaranteed to be loaded.

This is not a complete replacement for Facebook's dataloader. package. While it does provide some batching, it's primary purpose is to load the relations and fields needed to resolve the query. In most cases, you will most likely not need to use dataloader when using this package. However, I have noticed in my own use that there are occasions where this may need to be combined with dataloader to remove N + 1 queries. One such case was a custom resolver for a many-to-many relation that existed in the GraphQL Schema but not on a database level. In order to completely remove the N+1 queries from that resolver, I had to wrap the TypeORM GraphQL loader in a Facebook DataLoader. If you find that you are in a situation where the TypeORM GraphQL loader is not solving the N+1 problem, please open an issue and I'll do my best to help you out with it. 

This package has currently only been tested with Postgresql and SQLite. In theory, everything should work with the other SQL variants that TypeORM supports, as it uses the TypeORM Query Builder API to construct the database queries. If you run into any issues with other SQL dialects, please open an issue.

For help with pagination, first read [Pagination Advice](https://gitlab.com/Mando75/typeorm-graphql-loader/-/blob/master/md/pagination.md)

## API <a name="API"> 

Documentation for the Public API

## Contributing <a name="Contributing">

All development for this project is done on GitLab.com. However, I realize that many developers use GitHub as their primary development platform. If you do not use and do not wish to create a GitLab account, you can open an issue in the mirrored [GitHub Repository](https://github.com/Mando75/typeorm-graphql-loader). Please note that all merge requests must be done via GitLab as the GitHub repo is a read-only mirror. 

When opening an issue, please include the following information:

- Package Version
- Database and version being used
- TypeORM version
- GraphQL library being used
- Description of the problem
- Example code

Please open an issue before opening any Merge Requests.

## Problem <a name="Problem">

TypeORM is a pretty powerful tool, and it gives you quite a bit of flexibility
in how you manage entity relations. TypeORM provides 3 ways to load your
relations, eagerly, manually, or lazily. For more info on how this works, see
the [TypeORM Documentation](https://typeorm.io/#/eager-and-lazy-relations).

While this API is great for having fine-grained control of you data layer, it
can get frustrating to use in a GraphQL schema. For example, lets say we have
three entities, User, Author, and Book. Each Book has an Author, and each Author
has a User. We want to expose these relations via a GraphQL API. Our issue now
becomes how to resolve these relations. Let's look at how an example resolver
function might try to resolve this query:

Query

```graphql
query bookById($id: ID!) {
  book(id: $id) {
    id
    name
    author {
      id
      user {
        id
        name
      }
    }
  }
}
```

We could do something simple like this:

```ts
function finBookById(object, args, context, info) {
  return Book.findOne(args.id);
}
```

but then the author and user relations won't be loaded. We can remedy that by
specifying them in our find options like so:

```ts
function finBookById(object, args, context, info) {
  return Book.findOne(args.id, { relations: ["author", "author.user"] });
}
```

however, this could get really nasty if we have many relations we may need.
Well, we could just set all of our relations to eagerly load so we don't need to
specify them, but then we may start loading a bunch of data we may never use
which isn't very performant at scale.

How about just defining a resolver for every relation and loading them as
needed? That could work, but it seems like a lot of work and duplication of
effort when we've already specified our relations on the entity level.

Another possible, and probably intuitive solution is to use lazy relations.
Because lazy relations return Promises, as long as we give the resolver an
instance of our Book entity, it will call each relation and wait for the Promise
to resolve, fixing our problem. It let's us use our original resolver function

```ts
function finBookById(object, args, context, info) {
  return Book.findOne(args.id);
}
```

and ApolloServer will just automagically resolve the relation promises for us
and return the data. Seems great right? It's not. This introduces a massive N+1
problem. Now every time you query a subrelation, ApolloServer will inadvertently
perform another database query to load the lazy relation. At small scale this
isn't a problem, but the more complex your schema becomes, the harder it will
hit your performance.

## Solution <a name="Solution">

This package offers a solution to take away all the worry of how you manage
your entity relations in the resolvers. GraphQL provides a parameter in each
resolver function called `info`. This `info` parameter contains the entire query
tree, which means we can traverse it and figure out exactly which fields need to
be selected, and which relations need to be loaded. This can then be used to
create one SQL query that can get all of the information at once.

Because the loader uses the queryBuilder API, it does not matter if you have all
"normal", "lazy", "eager" relations, or a mix of all of them. You give it your
starting entity and the GraphQL query info, and it will figure out what data you
need and give it back to you in a structured TypeORM entity. Additionally, it
provides some caching functionality as well, which will dedupe identical query
signatures executed in the same tick.

## Acknowledgments <a name="Acknowledgments">

This project is based on the work of [Weboptimizer's typeorm-loader
package](https://github.com/Webtomizer/typeorm-loader). I work quite a bit with
Apollo Server + TypeORM and I was looking to find a way to more efficiently pull
data via TypeORM for GraphQL via intelligently loading the needed relations for
a given query. I stumbled across his package, which seemed to
promise all the functionality, but it seemed to be in a broken/unmaintained
state. After several months of no response from the author, and with significant
bug fixes/features added in my fork, I decided to just make my own package. So
thanks to Weboptimizer for doing a lot of the ground work. If you ever stumble
across this and would like to merge the features back into the main source repo,
I'd be more than happy to work with you to make that happen.
