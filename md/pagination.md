# Pagination Advice

Pagination can be tricky, especially if you are using a package like this.

I've thought about the best way to support pagination, and decided it would be best if I
didn't lock other developers into my way of doing things. As such, I tried to keep the 
pagination helper methods in the loader as unopinionated as possible.
It allows you to pass in an offset and limit to your paginated query and will return the
limited set of records with the total count of records (the count ignores the limit).
Under the hood, this uses TypeORM's `getManyAndCount()` method, so see their
documentation for further information on that method's behavior in relation to
pagination. My hope is that this will allow you to easily adapt your method of pagination 
to the loader without too much of a hassle.

One other tricky part of using pagination when using the loader comes from the structure
of GraphQL types. Typically when you have a paginated field in GraphQL, you provide a 
pagination wrapper around the actual type so you can get page data back from the query.
For example, take this paginated user query:

```graphql
type User {
  id: ID!
  name: String
}

type PaginatedUsers {
  users: [User]
  nextOffset: Int
  hasMore: Boolean
  totalCount: Int
}

type Query {
  paginatedUsers(offset: Int, limit: Int): PaginatedUsers
}
```
and its resolver
```typescript
async function paginatedUserResolver(obj, args, context, info) {
  const [records, totalCount] = await context
    .loader
    .loadEntity(User)
    .info(info)
    .pagination({offset: args.offset, limit: args.limit})
    .loadManyPaginated()
  
  return {
    users: records,
    // this is not a good way to calculate the nextOffset or 
    // hasMore, but you get the idea
    nextOffset: args.offset + args.limit,
    hasMore: args.offset + args.limit < totalCount,
    totalCount: totalCount
  }
}
```
Seems pretty straightforward right? Well you are going to run into problems when trying
to use the loader this way. When you pass `User` to `loadEntity`, the loader is going to 
assume that the root type of the request in the info object is a `User`, except it isn't,
it is a `PaginatedUser`. This means that the loader will try to query for the `nextOffset`,
`hasMore`, and `totalCount` fields on the user record, which of course don't exist. 

In order to get this to work, you need to tell the loader to ignore the root type of the
query, and instead only try to resolve everything under the `users` field. To do this, 
we can pass the name of what we want the root resolve field to be when we call the `info()`
method, like so:

```typescript
async function paginatedUserResolver(obj, args, context, info) {
  const [records, totalCount] = await context
    .loader
    .loadEntity(User)
    .info(info, "users")
    .pagination({offset: args.offset, limit: args.limit})
    .loadManyPaginated()
  
  return {
    users: records,
    // this is not a good way to calculate the nextOffset or 
    // hasMore, but you get the idea
    nextOffset: args.offset + args.limit,
    hasMore: args.offset + args.limit < totalCount,
    totalCount: totalCount
  }
}
```

The loader will then try and find the users field in the GraphQL Info object and
use it as the root field to resolve things for. 
