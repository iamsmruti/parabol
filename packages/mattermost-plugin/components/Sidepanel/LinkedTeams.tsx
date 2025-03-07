import graphql from 'babel-plugin-relay/macro'
import {useMemo} from 'react'
import {useDispatch} from 'react-redux'
import {useLazyLoadQuery} from 'react-relay'
import {LinkedTeamsQuery} from '../../__generated__/LinkedTeamsQuery.graphql'
import {useCurrentChannel} from '../../hooks/useCurrentChannel'
import {openLinkTeamModal} from '../../reducers'
import LoadingSpinner from '../LoadingSpinner'
import TeamRow from './TeamRow'

const LinkedTeams = () => {
  const channel = useCurrentChannel()
  const dispatch = useDispatch()
  const data = useLazyLoadQuery<LinkedTeamsQuery>(
    graphql`
      query LinkedTeamsQuery {
        config {
          parabolUrl
        }
        viewer {
          teams {
            id
            viewerTeamMember {
              id
              integrations {
                mattermost {
                  linkedChannels
                }
              }
            }
            ...TeamRow_team
          }
        }
      }
    `,
    {}
  )
  const linkedTeams = useMemo(() => {
    const {viewer} = data
    return viewer.teams.filter(
      (team) =>
        channel &&
        team.viewerTeamMember?.integrations.mattermost.linkedChannels.includes(channel.id)
    )
  }, [data, channel])

  const handleLink = () => {
    dispatch(openLinkTeamModal())
  }

  const isLoading = false
  const error = false

  return (
    <>
      <div className='flex items-center justify-between py-3 text-2xl font-semibold'>
        Linked Teams
        <button className='btn btn-primary' onClick={handleLink}>
          Link Team
        </button>
      </div>
      {isLoading && <LoadingSpinner text='Loading...' />}
      {error && <div className='error-text p-2'>Loading teams failed, try refreshing the page</div>}
      {linkedTeams?.length === 0 && (
        <p className='p-2 font-semibold'>There are no teams linked to this channel</p>
      )}
      <div className='flex flex-col overflow-y-scroll'>
        {linkedTeams?.map((team) => <TeamRow key={team.id} teamRef={team} />)}
      </div>
    </>
  )
}

export default LinkedTeams
