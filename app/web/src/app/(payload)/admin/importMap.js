import { LeadSummary as LeadSummary_058c86e2e849d17483a91904c969d4d7 } from '../../../admin-ui/leads/LeadSummary'
import { PhoneCell as PhoneCell_54e47d4b0c37d2ab2c895a437dcc4457 } from '../../../admin-ui/leads/cells'
import { ContactButtons as ContactButtons_058c86e2e849d17483a91904c969d4d7 } from '../../../admin-ui/leads/LeadSummary'
import { ReadOnlyDate as ReadOnlyDate_6ec2c4e26279a67c1ee6ae49672f440c } from '../../../admin-ui/leads/ReadOnlyDate'
import { StatusCell as StatusCell_54e47d4b0c37d2ab2c895a437dcc4457 } from '../../../admin-ui/leads/cells'
import { StatusHint as StatusHint_578985c741f220ff2bb08d9d64a24759 } from '../../../admin-ui/leads/StatusHint'
import { LeadQuickFilters as LeadQuickFilters_63edfb9f5c15c700569ac4c199964ec9 } from '../../../admin-ui/leads/QuickFilters'
import { AdminNav as AdminNav_454fcd92575ff2c16813086614bb2c2c } from '../../../admin-ui/Nav'
import { AdminIcon as AdminIcon_8a9d259bdffd728358371a4391438b89 } from '../../../admin-ui/brand'
import { AdminLogo as AdminLogo_8a9d259bdffd728358371a4391438b89 } from '../../../admin-ui/brand'
import { StaffLoginNotice as StaffLoginNotice_d7868647ca41487517c1f53878e7aa00 } from '../../../components/StaffLoginNotice'
import { DateFormatProvider as DateFormatProvider_40b4ad3483b7c9301092757f254fb415 } from '../../../admin-ui/DateFormatProvider'
import { HomeView as HomeView_2a553b0a5ba3ecce6d06ffd42da26b87 } from '../../../admin-ui/HomeView'
import { OverviewHome as OverviewHome_2a553b0a5ba3ecce6d06ffd42da26b87 } from '../../../admin-ui/HomeView'
import { HiddenPagesView as HiddenPagesView_d41ca7fc92cc370db6a5f8134778a2fd } from '../../../admin-ui/HiddenPagesView'
import { ContentReviewView as ContentReviewView_559b0f15b41f54742617fe9db3cc158e } from '../../../components/admin/ContentReviewView'
import { ProjectsView as ProjectsView_52b0369b50b14f6311ca8629549163eb } from '../../../components/admin/ProjectsView'
import { KpiView as KpiView_109205f83ea2a8cc06c0d5512f810249 } from '../../../components/admin/KpiView'
import { StoreView as StoreView_c5823b9986fc4257cc0312f4ce4a9e1d } from '../../../components/admin/StoreView'
import { ServiceView as ServiceView_ad3e27291416f1a56784160d533bb966 } from '../../../components/admin/ServiceView'
import { ProductDraftsView as ProductDraftsView_4b5ed9de17a411a0756c39d8be000287 } from '../../../components/admin/ProductDraftsView'
import { AccountSecurityView as AccountSecurityView_3cb9f6abf7e0ca5b8b9ba5fd88383603 } from '../../../components/admin/AccountSecurityView'
import { SalesView as SalesView_07d97a633555f085224e700a7e7eead5 } from '../../../components/admin/SalesView'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'
import { VercelBlobClientUploadHandler as VercelBlobClientUploadHandler_16c82c5e25f430251a3e3ba57219ff4e } from '@payloadcms/storage-vercel-blob/client'

/** @type import('payload').ImportMap */
export const importMap = {
  "/admin-ui/leads/LeadSummary#LeadSummary": LeadSummary_058c86e2e849d17483a91904c969d4d7,
  "/admin-ui/leads/cells#PhoneCell": PhoneCell_54e47d4b0c37d2ab2c895a437dcc4457,
  "/admin-ui/leads/LeadSummary#ContactButtons": ContactButtons_058c86e2e849d17483a91904c969d4d7,
  "/admin-ui/leads/ReadOnlyDate#ReadOnlyDate": ReadOnlyDate_6ec2c4e26279a67c1ee6ae49672f440c,
  "/admin-ui/leads/cells#StatusCell": StatusCell_54e47d4b0c37d2ab2c895a437dcc4457,
  "/admin-ui/leads/StatusHint#StatusHint": StatusHint_578985c741f220ff2bb08d9d64a24759,
  "/admin-ui/leads/QuickFilters#LeadQuickFilters": LeadQuickFilters_63edfb9f5c15c700569ac4c199964ec9,
  "/admin-ui/Nav#AdminNav": AdminNav_454fcd92575ff2c16813086614bb2c2c,
  "/admin-ui/brand#AdminIcon": AdminIcon_8a9d259bdffd728358371a4391438b89,
  "/admin-ui/brand#AdminLogo": AdminLogo_8a9d259bdffd728358371a4391438b89,
  "/components/StaffLoginNotice#StaffLoginNotice": StaffLoginNotice_d7868647ca41487517c1f53878e7aa00,
  "/admin-ui/DateFormatProvider#DateFormatProvider": DateFormatProvider_40b4ad3483b7c9301092757f254fb415,
  "/admin-ui/HomeView#HomeView": HomeView_2a553b0a5ba3ecce6d06ffd42da26b87,
  "/admin-ui/HomeView#OverviewHome": OverviewHome_2a553b0a5ba3ecce6d06ffd42da26b87,
  "/admin-ui/HiddenPagesView#HiddenPagesView": HiddenPagesView_d41ca7fc92cc370db6a5f8134778a2fd,
  "/components/admin/ContentReviewView#ContentReviewView": ContentReviewView_559b0f15b41f54742617fe9db3cc158e,
  "/components/admin/ProjectsView#ProjectsView": ProjectsView_52b0369b50b14f6311ca8629549163eb,
  "/components/admin/KpiView#KpiView": KpiView_109205f83ea2a8cc06c0d5512f810249,
  "/components/admin/StoreView#StoreView": StoreView_c5823b9986fc4257cc0312f4ce4a9e1d,
  "/components/admin/ServiceView#ServiceView": ServiceView_ad3e27291416f1a56784160d533bb966,
  "/components/admin/ProductDraftsView#ProductDraftsView": ProductDraftsView_4b5ed9de17a411a0756c39d8be000287,
  "/components/admin/AccountSecurityView#AccountSecurityView": AccountSecurityView_3cb9f6abf7e0ca5b8b9ba5fd88383603,
  "/components/admin/SalesView#SalesView": SalesView_07d97a633555f085224e700a7e7eead5,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
  "@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler": VercelBlobClientUploadHandler_16c82c5e25f430251a3e3ba57219ff4e
}
