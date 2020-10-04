# TypeORM GraphQL Relation Loader

A dataloader for TypeORM that makes it easy to load TypeORM relations for
GraphQL query resolvers.


[![npm version](https://badge.fury.io/js/%40mando75%2Ftypeorm-graphql-loader.svg)](https://badge.fury.io/js/%40mando75%2Ftypeorm-graphql-loader)
![npm](https://img.shields.io/npm/dm/@mando75/typeorm-graphql-loader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pipeline status](https://gitlab.com/Mando75/typeorm-graphql-loader/badges/master/pipeline.svg)](https://gitlab.com/Mando75/typeorm-graphql-loader/commits/master)
[![coverage report](https://gitlab.com/Mando75/typeorm-graphql-loader/badges/master/coverage.svg)](https://gitlab.com/Mando75/typeorm-graphql-loader/-/commits/master)



## UPGRADE NOTICE

The 1.0.0 release of this package includes almost a complete rewrite
of the source code. The public interface of the loader has changed significantly. 
As such, upgrading from the older versions will require significant work. 

For those upgrading, I highly recommend reading through the [new documentation](https://gql-loader.bmuller.net) to get an idea of the changes required.

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
loader that will trace through a GraphQL query info object and load the
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
connection as the first argument, and a [LoaderOptions](https://gql-loader.bmuller.net/interfaces/loaderoptions.html) type as an
optional second parameter.

### Apollo Server Example
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
            .loadEntity(Book, "book")
            .where("book.id = :id", { id })
            .info(info)
            .loadOne();
    }
}
```

Please note that the loader will only return the fields and relations that
the client requested in the query. You can configure certain entity fields to be required or ignored via the [ConfigureLoader](https://gql-loader.bmuller.net/globals.html#configureloader) decorator.

## Gotchas <a name="Gotchas">

Because this package reads which relations and fields to load from the GraphQL query info object, the loader only works if your schema field names match your TypeORM entity field names. If it cannot find a requested GraphQL query field, it will not return it. In this case, you will need to provide a custom resolver for that field in your GraphQL resolvers file. In this case, the loader will provide the resolver function with an `object` parameter which is an entity loaded with whichever other fields your query requested. The loader will always return an object with at least the primary key loaded, so basic method calls should be possible. The loader will automatically scan your entity and include whatever column marked as primary key in the query. 

This is not a complete replacement for the [dataloader](https://github.com/graphql/dataloader) package, its purpose is different. While it does provide some batching, its primary purpose is to load the relations and fields needed to resolve the query. In most cases, you will most likely not need to use dataloader when using this package. However, I have noticed in my own use that there are occasions where this may need to be combined with dataloader to remove N + 1 queries. One such case was a custom resolver for a many-to-many relation that existed in the GraphQL Schema but not on a database level. In order to completely remove the N+1 queries from that resolver, I had to wrap the TypeORM GraphQL loader in a Facebook DataLoader. If you find that you are in a situation where the TypeORM GraphQL loader is not solving the N+1 problem, please open an issue, and I'll do my best to help you out with it. 

This package has currently only been tested with Postgresql and SQLite. In theory, everything should work with the other SQL variants that TypeORM supports, as it uses the TypeORM Query Builder API to construct the database queries. If you run into any issues with other SQL dialects, please open an issue.

For help with pagination, first read [Pagination Advice](https://gitlab.com/Mando75/typeorm-graphql-loader/-/blob/master/md/pagination.md)

## Roadmap <a name="Roadmap">

### Relay Support

Currently, the loader only supports offset pagination. I would like to add the ability to support Relay-style pagination out of the box. 

[Track Progress](https://gitlab.com/Mando75/typeorm-graphql-loader/-/issues/8)

### Remap Field Names

With the introduction of the `ConfigureLoader` decorator, I will soon be able to add the ability to remap GraphQL fields to entity fields. For example, say your TypeORM entity has a property called `computedTotal`, but you want that property to map to a field called `total` in your GraphQL schema. Currently, there is no way to accomplish that with the loader. I would like to add an option to the configuration decorator to perform such a mapping. 

[Track Progress](https://gitlab.com/Mando75/typeorm-graphql-loader/-/issues/11)

## API <a name="API"> 

[Documentation for the Public API](https://gql-loader.bmuller.net)

## Contributing <a name="Contributing">

This project is developed on [GitLab.com](https://gitlab.com/Mando75/typeorm-graphql-loader). However, I realize that many developers use GitHub as their primary development platform. If you do not use and do not wish to create a GitLab account, you can open an issue in the mirrored [GitHub Repository](https://github.com/Mando75/typeorm-graphql-loader). Please note that all merge requests must be done via GitLab as the GitHub repo is a read-only mirror. 

When opening an issue, please include the following information:

- Package Version
- Database and version used
- TypeORM version
- GraphQL library used
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
function findBookById(object, args, context, info) {
  return Book.findOne(args.id);
}
```

but then the author and user relations won't be loaded. We can remedy that by
specifying them in our find options like so:

```ts
function findBookById(object, args, context, info) {
  return Book.findOne(args.id, { relations: ["author", "author.user"] });
}
```

however, this could get really nasty if we have many relations we may need.
Well, we could just set all of our relations to eagerly load so we don't need to
specify them, but then we may start loading a bunch of data we may never use
which isn't very performant at scale.

How about just defining a resolver for every relation and loading them as
needed? That could work, but it seems like a lot of work and duplication of
effort when we've already specified our relations on the entity level. This will also lead us to a path where we will need to start creating custom loaders via [dataloader](https://github.com/graphql/dataloader) to deal with impending [N + 1](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping) problems.

Another possible, and probably intuitive solution is to use lazy relations.
Because lazy relations return Promises, as long as we give the resolver an
instance of our Book entity, it will call each relation and wait for the Promise
to resolve, fixing our problem. It lets us use our original resolver function:

```ts
function findBookById(object, args, context, info) {
  return Book.findOne(args.id);
}
```

and GraphQL will just automatically resolve the relation promises for us
and return the data. Seems great right? It's not. This introduces a massive N+1
problem. Now every time you query a sub-relation, GraphQL will inadvertently
perform another database query to load the lazy relation. At small scale this
isn't a problem, but the more complex your schema becomes, the harder it will
hit your performance.

## Solution <a name="Solution">

This package offers a solution to take away all the worry of how you manage
your entity relations in the resolvers. GraphQL provides a parameter in each
resolver function called `info`. This `info` parameter contains the entire query
graph, which means we can traverse it and figure out exactly which fields need to
be selected, and which relations need to be loaded. This is used to
create one SQL query that can get all the information at once.

Because the loader uses the queryBuilder API, it does not matter if you have all
"normal", "lazy", "eager" relations, or a mix of all of them. You give it your
starting entity, and the GraphQL query info, and it will figure out what data you
need and give it back to you in a structured TypeORM entity. Additionally, it
provides some caching functionality as well, which will dedupe identical query
signatures executed in the same tick.

## Acknowledgments <a name="Acknowledgments">

This project inspired by the work of [Weboptimizer's typeorm-loader
package](https://github.com/Webtomizer/typeorm-loader). I work quite a bit with
Apollo Server + TypeORM and I was looking to find a way to more efficiently pull
data via TypeORM for GraphQL via intelligently loading the needed relations for
a given query. I stumbled across his package, which seemed to
promise all the functionality, but it seemed to be in a broken/unmaintained
state. After several months of no response from the author, and with significant
bug fixes/features added in my fork, I decided to just make my own package. So
thanks to Weboptimizer for doing a lot of the groundwork. Since then, I have
almost completely rewritten the library to be a bit more maintainable and feature
rich, but I would still like to acknowledge the inspiration his project gave me. 
