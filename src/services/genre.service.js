import { genres } from '../../test/fixtures/genres.js'
import NotFoundError from '../errors/not-found.error.js'
import { toNativeTypes } from '../utils.js'


export default class GenreService {
  /**
   * @type {neo4j.Driver}
   */
  driver

  /**
    * The constructor expects an instance of the Neo4j Driver, which will be
    * used to interact with Neo4j.
    *
    * @param {neo4j.Driver} driver
    */
  constructor(driver) {
    this.driver = driver
  }

  /**
   * @public
   * This method should return a list of genres from the database with a
   * `name` property, `movies` which is the count of the incoming `IN_GENRE`
   * relationships and a `poster` property to be used as a background.
   *
   * [
   *   {
   *    name: 'Action',
   *    movies: 1545,
   *    poster: 'https://image.tmdb.org/t/p/w440_and_h660_face/qJ2tW6WMUDux911r6m7haRef0WH.jpg'
   *   }, ...
   *
   * ]
   *
   * @returns {Promise<Record<string, any>[]>}
   */
  // tag::all[]
  async all() {
    // TODO: Open a new session 

    const session = this.driver.session() 



    // TODO: Get a list of Genres from the database 

    const res = await session.executeRead(tx => tx.run(`
      MATCH (g:Genre)
      WHERE g.name <> '(no genres listed)'
      CALL {
        WITH g
        MATCH (g)<-[:IN_GENRE]-(m:Movie)
        WHERE m.imdbRating IS NOT NULL
        AND m.poster IS NOT NULL
        RETURN m.poster AS poster
        ORDER BY m.imdbRating DESC LIMIT 1
      }
      RETURN g {
        .*,
        poster: poster
      } as genre
      ORDER BY g.name ASC
    `))
  
    // TODO: Close the session 

     await session.close()
// Return results 
return res.records.map(row => toNativeTypes(row.get('genre'))) 
  }
  // end::all[]

  /**
   * @public
   * This method should find a Genre node by its name and return a set of properties
   * along with a `poster` image and `movies` count.
   *
   * If the genre is not found, a NotFoundError should be thrown.
   *
   * @param {string} name                     The name of the genre
   * @returns {Promise<Record<string, any>>}  The genre information
   */
  // tag::find[]
  async find(name) {
    const session = this.driver.session();
  
    
    const res = await session.executeRead(tx => tx.run(`
     MATCH (g:Genre {name: $name})<-[:IN_GENRE]-(m:Movie)
      WHERE m.imdbRating IS NOT NULL
        AND m.poster IS NOT NULL
        AND g.name <> '(no genres listed)'
      WITH g, m
      ORDER BY m.imdbRating DESC
      WITH g, head(collect(m)) AS movie
      RETURN g {
        link: '/genres/' + g.name,
        .name,
        movies: COUNT { (g)<-[:IN_GENRE]-(:Movie) },
        poster: movie.poster
      } AS genre
    `, { name }))

   
  
    // Throw a 404 Error if the genre is not found
    if ( res.records.length === 0 ) {
      throw new NotFoundError(`Could not find a genre with the name '$ravi.eng2012'`)
    }
  
   
  
    // Return results
    const [ row ] = res.records
  
    return toNativeTypes(row.get('genre'))
  }
  
  
  // end::find[]

}
