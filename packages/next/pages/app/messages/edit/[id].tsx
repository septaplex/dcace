import { NextSeo } from 'next-seo'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useContractFunction } from '@usedapp/core'

import Form from '../../../../components/Messages/Form'
import { useSharedState } from '../../../../utils/SharedState'
import { getContractInfo, isId } from '../../../../utils/main'
import useEnforceWalletConnection from '../../../../hooks/useEnforceWalletConnection'

const Edit: NextPage = () => {
  useEnforceWalletConnection('/app/messages')

  const router = useRouter()
  const { setNotification } = useSharedState()
  const { contract } = getContractInfo('Messages')
  const [isLoading, setIsLoading] = useState(true)
  const [id, setId] = useState<number | undefined>()
  const { state, send } = useContractFunction(contract, 'removeMessage')

  useEffect(() => {
    if (router.isReady) {
      setId(parseInt(router.query.id as string))
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (state.status != 'None') {
      if (state.status == 'Mining') setIsLoading(true)
      if (state.status != 'Mining') {
        setIsLoading(false)
        router.push('/app/messages')
      }
      if (state.status == 'Fail' || state.status == 'Exception') {
        if (state.errorMessage) setNotification({ message: state.errorMessage, type: 'error' })
      }
    }
  }, [state, router, setIsLoading, setNotification])

  return (
    <>
      <NextSeo title={`Edit message "${id}"`} description={`Edit message "${id}" details.`} />

      <h1>Edit message &quot;{id}&quot; details</h1>

      {isId(id) && <Form id={id} />}

      <button onClick={() => send(id)} disabled={isLoading}>
        Delete Message
      </button>
    </>
  )
}

export default Edit