# Change Log

## [1.4.0]

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


