import { Catalog } from '../models/catalog.model'

export interface CatalogService {
  getCatalog(): Promise<Catalog>
}
