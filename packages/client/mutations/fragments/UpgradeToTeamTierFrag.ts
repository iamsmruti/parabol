import graphql from 'babel-plugin-relay/macro'

graphql`
  fragment UpgradeToTeamTierFrag_organization on UpgradeToTeamTierSuccess {
    organization {
      creditCard {
        brand
        last4
        expiry
      }
      company {
        tier
      }
      tier
      isPaid
      billingTier
      isBillingLeader
      isOrgAdmin
      periodEnd
      periodStart
      updatedAt
      lockedAt
      teams {
        tier
      }
    }
  }
`
