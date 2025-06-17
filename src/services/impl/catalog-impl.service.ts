import axios from 'axios'
import { Catalog } from '../../models/catalog.model'
import { CatalogService } from '../catalog.service'
import {
  ChildEntry,
  PlanEntry,
  ServiceEntry,
} from '../../models/global-catalog.model'
import { plainToInstance } from 'class-transformer'
import { ServiceDefinition } from '../../models/service-definition.model'
import { Plan } from '../../models/plan.model'

export class CatalogServiceImpl implements CatalogService {
  private iamEndpoint: string = process.env.IAM_ENDPOINT || ''
  private globalCatalogEndpoint: string = process.env.GLOBAL_CATALOG_URL || ''
  private serviceId: string = process.env.GLOBAL_CATALOG_SERVICE_ID || ''
  private accountId: string = process.env.GLOBAL_CATALOG_ACCOUNT_ID || 'global'
  private apiKey: string = process.env.IAM_API_KEY || ''

  private catalog: Catalog = new Catalog([])
  private lastUpdate: string | undefined

  private static readonly IAM_IDENTITY_TOKEN_PATH = '/identity/token'
  private static readonly IAM_GRANT_TYPE =
    'urn:ibm:params:oauth:grant-type:apikey'
  private static readonly GC_ENTRY_PATH = '/api/v1/'

  constructor() {
    this.getCatalog()
  }

  public async getCatalog(): Promise<Catalog> {
    const iamAccessToken = await this.getIamAccessToken()
    const globalCatalogEntry = await this.getGlobalCatalogEntry(iamAccessToken)
    if (this.lastUpdate === globalCatalogEntry.updated) {
      return this.catalog
    }
    this.catalog = await this.fromGlobalCatalog(
      globalCatalogEntry,
      iamAccessToken,
    )
    this.lastUpdate = globalCatalogEntry.updated
    return this.catalog
  }

  private async getIamAccessToken(): Promise<string> {
    const response = await axios.post(
      `${this.iamEndpoint}${CatalogServiceImpl.IAM_IDENTITY_TOKEN_PATH}`,
      {
        grant_type: CatalogServiceImpl.IAM_GRANT_TYPE,
        apikey: this.apiKey,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      },
    )

    if (response.data && response.data.access_token) {
      return response.data.access_token
    } else {
      throw new Error('Failed to retrieve IAM access token')
    }
  }

  private async getGlobalCatalogEntry(
    iamAccessToken: string,
  ): Promise<ServiceEntry> {
    const response = await axios.get(
      `${this.globalCatalogEndpoint}${CatalogServiceImpl.GC_ENTRY_PATH}${this.serviceId}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${iamAccessToken}`,
        },
        params: {
          account: this.accountId,
          complete: true,
          depth: 100,
        },
      },
    )

    if (response.data && typeof response.data === 'object') {
      return plainToInstance(ServiceEntry, {
        name: response.data.name,
        kind: response.data.kind,
        overviewUI: response.data.overview_ui,
        images: response.data.images,
        metadata: response.data.metadata,
        id: response.data.id,
        visibility: response.data.visibility,
        children: response.data.children,
        created: response.data.created,
        updated: response.data.updated,
      })
    } else {
      throw new Error('Failed to retrieve new Global Catalog Entry')
    }
  }

  private async fromGlobalCatalog(
    globalCatalogEntry: ServiceEntry,
    iamAccessToken: string,
  ): Promise<Catalog> {
    const metadata: object =
      CatalogServiceImpl.metadataFromEntry(globalCatalogEntry)
    const plans: Plan[] = await this.getPlans(
      globalCatalogEntry.children,
      iamAccessToken,
    )
    const definition: ServiceDefinition = {
      metadata,
      name: globalCatalogEntry.name,
      id: globalCatalogEntry.id,
      description: globalCatalogEntry.overviewUI?.en.description || '',
      bindable: globalCatalogEntry.metadata.service.bindable,
      planUpdateable: false,
      plans,
    }
    return new Catalog([definition])
  }

  private static metadataFromEntry(globalCatalogEntry: ServiceEntry): object {
    return {
      type: globalCatalogEntry.visibility.restrictions,
      longDescription: globalCatalogEntry.overviewUI?.en.long_description || '',
      displayName: globalCatalogEntry.overviewUI?.en.display_name || '',
      imageUrl: globalCatalogEntry.images.image,
      featuredImageUrl: globalCatalogEntry.images.feature_image,
      smallImageUrl: globalCatalogEntry.images.small_image,
      mediumImageUrl: globalCatalogEntry.images.medium_image,
      documentationUrl: globalCatalogEntry.metadata.ui.urls.doc_url,
      termsUrl: globalCatalogEntry.metadata.ui.urls.terms_url,
      instructionsUrl: globalCatalogEntry.metadata.ui.urls.instructions_url,
      parameters: globalCatalogEntry.metadata.service.parameters,
      created: globalCatalogEntry.created,
      updated: globalCatalogEntry.updated,
    }
  }

  private async getPlans(
    childEntries: ChildEntry[],
    iamAccessToken: string,
  ): Promise<Plan[]> {
    const plans: Plan[] = []
    for (const child of childEntries) {
      const planEntry = await this.getPlanGlobalEntry(
        child.metadata.pricing.url,
        iamAccessToken,
      )
      plans.push(
        new Plan(
          child.id,
          new Date(child.created),
          new Date(child.updated),
          child.name,
          child.overview_ui.en.description,
          {
            created: child.created,
            updated: child.updated,
            allowInternalUsers: child.metadata.plan.allow_internal_users,
            displayName: child.overview_ui.en.display_name,
            costs: planEntry,
          },
          child.metadata.pricing.type === 'free',
        ),
      )
    }
    return plans
  }

  private async getPlanGlobalEntry(
    url: string,
    iamAccessToken: string,
  ): Promise<PlanEntry> {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${iamAccessToken}`,
      },
    })
    if (response.data && typeof response.data === 'object') {
      return plainToInstance(PlanEntry, {
        type: response.data.type,
        metrics: response.data.metrics,
      })
    } else {
      throw new Error('Failed to retrieve Plan Global Catalog Entry')
    }
  }
}
