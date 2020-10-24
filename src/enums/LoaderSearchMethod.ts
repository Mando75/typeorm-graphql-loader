export enum LoaderSearchMethod {
  /**
   * Uses `LIKE '%mysearch%'`
   */
  ANY_POSITION,
  /**
   * Uses `LIKE 'mysearch%'`
   */
  STARTS_WITH,
  /**
   * Uses `LIKE '%mysearch'`
   */
  ENDS_WITH,
}
