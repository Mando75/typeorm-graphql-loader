# Change Log

## [1.7.2]

### Fixed

Bug where different queries can have the same cache key due to identical field sets.
Can now be avoided by using different table aliases in your resolver.

## [1.7.1]

### Added

Add `sqlJoinAlias` option to `ConfigureLoader` so users can specify the alias of a given table's join in the SQL query. 

## [1.7.0]

### Fixed

Not all types were not being exported properly. This should be addressed.

DecoratorResolverPredict was getting an empty list for requested fields. This was a bug introduced during the refactor of the InfoParser and has been fixed.

### Added

`graphQLName` option to `ConfigureLoader` decorator. Allows consumers to specify the name of a TypeORM
entity field in the GraphQL schema so that it is properly selected if requested.

## [1.6.0]

### Changed

The `GraphQLQueryBuilder#orWhere` method now accepts an instance of Brackets as a parameter. This brings the loader back into parity with the TypeORM `SelectQueryBuilder#orWhere` method.

### Added

`GraphQLQueryBuilder#ejectQueryBuilder` method that accepts a callback which can be used to customize the TypeORM SelectQueryBuilder instance before executing against the database.

## [1.5.0]

### Fixed 
Fixed an issue with the loader not being able to load fragments on Union types. Thanks to Nico Britos for providing the fix for the issue.

### Changed
Internally the loader now uses the graphql-parse-resolve-info package to get the requested selection of
fields instead of the home-grown method used before. 

Some internal loader type definitions have changed due to the migration to the new info parser. It is for this reason I bumped the package a minor version over just a patch. 

## [1.4.2]

### Fixed

Queries are no longer run in a transaction, preventing a transaction error in some dbs. Thanks to Andrey Vasilev for identifying the issue and providing the fix. 

## [1.4.1]

Fixed issue with pagination manifesting from internal TypeORM bug in skip/take. Reverted back to using offset/limit

## [1.4.0]

### Fixed

Paginated records with order by conditions could come back in the incorrect order due to an internal TypeORM. A different TypeORM bug prevented the loader from using the suggested `skip/take` TypeORM API. That `skip/take` bug has been fixed, so the loader is able to switch to `skip/take` and address the ordering bug. 

### Changed

The `ignore` and `requried` options in the `ConfigureLoader` decorator now also accept a predicate function in addition to primitive booleans. If given, the predicate function will be called at resolve time of that field during the GraphQL query resolution. For more information, read the [documentation](https://gql-loader.bmuller.net/globals.html#fieldconfigurationpredicate)

Updated package dependencies and peer dependencies to latest versions


### Added

A new `context` method to the GraphQLQueryBuilder that receives a user defined context and passes it to the configuration decorator predicates at resolve time. See the [documentation](https://gql-loader.bmuller.net/classes/graphqlquerybuilder.html#context).

## [1.3.0]

### Added
A new decorator called `ConfigureLoader` that allows for more control over how entity fields/relations are resolved by the loader. For the initial version, the decorator allows you to ignore or require fields/embeds/relations during query resolution. This is still experimental and may require some hardening. For more information, see the [documentation](https://gql-loader.bmuller.net/globals.html#configureloader)

### Deprecated

`GraphQLQueryBuilder#selectFields`. This was always a rather flaky solution to the problem it was trying to solve. With the release of the configuration decorator, I don't plan on supporting or fixing any bugs with this anymore. Once the decorator API is solidified, this will be removed in a 2.0 release. 

## [1.2.0]

### Added

* Changelog

### Changed

* Fixed an issue with table aliases growing too long. The QueryBuilder now generates a hash for any tables that are joined during query resolution. See [The Gitlab Issue](https://gitlab.com/Mando75/typeorm-graphql-loader/-/issues/7) for more details. Thanks to Kees van Lierop and Roemer Bakker for the fix. 

* The loader now uses the entity metadata to query the primary key column for each relation joined, regardless of whether the field was queried. This is to ensure that custom resolvers can access the parent object with at least the primary key. This renders the `primaryKeyColumn` option in `LoaderOptions` obsolete.

### Deprecated

* `primaryKeyColumn` field in `LoaderOptions`. See changes for reasoning.


## [1.1.1]

### Fixed

* Issue with the loader not being able to query columns that had a different name from the entity propertyName

## [1.1.0]

### Added

* Support for querying fields from embedded entities

### Changed

* The `GraphQLQueryBuilder#info()` method to support using a path to fetch a nested field as entity root

## [1.0.0]

### Changed
* Initial full release
* Full refactor of codebase to a query-builder format. 
* Created a [documentation website](https://gql-loader.bmuller.net)


