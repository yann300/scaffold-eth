import React, { useEffect, useState, useCallback, useReducer } from 'react'
// import { useUserProviderAndSigner } from 'eth-hooks'
import { useExchangeEthPrice } from 'eth-hooks/dapps/dex'
import { NETWORKS } from './constants'
import { Layout } from './components'
import { BrowseBadges } from './views'
import MintingPage from './views/MintingPage'
import CloseIcon from '@mui/icons-material/Close'
import IconButton from '@mui/material/IconButton'
import Toast from 'components/Toast'
import { BadgeContext } from 'contexts/BadgeContext'
import externalContracts from 'contracts/external_contracts'
import { getCurrentChainId, switchToOptimism } from 'helpers/SwitchToOptimism'
import { useUserProviderAndSigner } from 'eth-hooks'
const { ethers } = require('ethers')

const APPSTATEACTION = {
  GOERLICHAINID: '5',
  OPTIMISMCHAINID: '10',
}

const defaultState = {
  provider: new ethers.providers.Web3Provider(window.ethereum),
  chainId: '5',
  contractRef: externalContracts['5'].contracts.REMIX_REWARD,
}

function appStateReducer(state, actionType) {
  if (actionType.OPTIMISMCHAINID) {
    const newState = {
      provider: new ethers.providers.Web3Provider(window.ethereum),
      chainid: '10',
      contractRef: externalContracts['10'].contracts.REMIX_REWARD,
    }
    return newState
  }

  return state
}

// @ts-ignore
function App({ mainnet }) {
  const [appState, appDispatch] = useReducer(appStateReducer, defaultState)
  const [localProvider, setLocalProvider] = useState()
  const [loaded, setLoaded] = useState(false)
  const [connectedAddress, setConnectedAddress] = useState()
  // const [injectedProvider, setInjectedProvider] = useState()
  const [address, setAddress] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [showToast, setShowToast] = useState(false)
  // const [selectedChainId, setSelectedChainId] = useState(appChainId)
  const contractConfig = { deployedContracts: {}, externalContracts: externalContracts || {} }

  const targetNetwork = NETWORKS['optimism']
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnet)

  let contractRef
  let providerRef
  const chainId = appState.chainId
  if (
    externalContracts[chainId] &&
    externalContracts[chainId].contracts &&
    externalContracts[chainId].contracts.REMIX_REWARD
  ) {
    contractRef = externalContracts[chainId].contracts.REMIX_REWARD
    providerRef = externalContracts[chainId].provider
  } else {
    console.log('kosi externalContract')
  }
  /* SETUP METAMASK */

  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const USE_BURNER_WALLET = false
  const userProviderAndSigner = useUserProviderAndSigner(appState.provider, localProvider, USE_BURNER_WALLET)

  const closeToast = () => {
    setShowToast(false)
  }

  const displayToast = () => {
    setShowToast(true)
  }

  useEffect(() => {
    window.ethereum.on('chainChanged', chainId => {
      window.location.reload()
    })
  }, [])

  useEffect(() => {
    const run = async () => {
      const local = new ethers.providers.StaticJsonRpcProvider(providerRef)
      await local.ready
      // const mainnet = new ethers.providers.StaticJsonRpcProvider(
      //   'https://mainnet.infura.io/v3/1b3241e53c8d422aab3c7c0e4101de9c',
      // )
      // @ts-ignore
      setLocalProvider(local)
      // setMainnet(mainnet)
      setLoaded(true)
      const provider = appState.provider
      const net = await provider.getNetwork()
      console.log({ provider, net })
      if (net.chainId === APPSTATEACTION.OPTIMISMCHAINID) {
        console.log('switching to optimism now...')
        await switchToOptimism()
        console.log('switched to optimism')
        // @ts-ignore
        appDispatch({ actionType: APPSTATEACTION.OPTIMISMCHAINID })
        console.log('updated state to carry optimism')
      }
    }
    run()
  }, [appState.provider, providerRef])

  useEffect(() => {
    async function getAddress() {
      const holderForConnectedAddress = await appState.provider.listAccounts()
      if (holderForConnectedAddress.length > 1 && connectedAddress) {
        setConnectedAddress(holderForConnectedAddress[0])
      }
      console.log('connectedAddress could not be set!')
    }
    getAddress()
  }, [appState.provider, connectedAddress])

  useEffect(() => {
    window.ethereum.on('chainChanged', chainId => {
      if (chainId === 5 || chainId === '5') {
        // @ts-ignore
        appDispatch({ actionType: APPSTATEACTION.GOERLICHAINID })
        window.location.reload()
      }
      if (chainId === 10 || chainId === '10') {
        // @ts-ignore
        appDispatch({ actionType: APPSTATEACTION.OPTIMISMCHAINID })
        window.location.reload()
      }
    })

    return () => {
      window.ethereum.removeListener('chainChanged', chainId => {
        console.log('removed')
      })
    }
  }, [appState.provider, appState])

  const logoutOfWeb3Modal = async () => {
    // @ts-ignore
    if (appState.provider && appState.provider.provider && typeof appState.provider.provider.disconnect == 'function') {
      // @ts-ignore
      await appState.provider.provider.disconnect()
    }
    setTimeout(() => {
      window.location.reload()
    }, 1)
  }

  const snackBarAction = (
    <>
      <IconButton size="small" aria-label="close" color="inherit" onClick={closeToast}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </>
  )

  const loadWeb3Modal = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      // console.log('MetaMask is not installed!')
      displayToast()
      // metamask not installed
      return
    }
    const provider = appState.provider // window.ethereum
    await provider.send('eth_requestAccounts', [])

    provider.on('chainChanged', chainId => {
      console.log(`chain changed to ${chainId}! updating providers`)
      if (chainId === 5 || chainId === '5') {
        // @ts-ignore
        appDispatch({ actionType: APPSTATEACTION.GOERLICHAINID })
        window.location.reload()
      }
      if (chainId === 10 || chainId === '10') {
        // @ts-ignore
        appDispatch({ actionType: APPSTATEACTION.OPTIMISMCHAINID })
        window.location.reload()
      }
    })

    /**
     * @param accountPayload string[]
     */
    provider.on('accountsChanged', async accountPayload => {
      // accountPayload Array<string>
      console.log(`account changed!`)
      const chainInfo = await getCurrentChainId()
      const { chainId } = chainInfo
      if (chainId === 5 || chainId === '5') {
        // @ts-ignore
        appDispatch({ actionType: APPSTATEACTION.OPTIMISMCHAINID })
        window.location.reload()
      }
      if (chainId === 10 || chainId === '10') {
        // @ts-ignore
        appDispatch({ actionType: APPSTATEACTION.OPTIMISMCHAINID })
        window.location.reload()
      }
    })

    // Subscribe to session disconnection
    provider.on('disconnect', (code, reason) => {
      console.log(code, reason)
      logoutOfWeb3Modal()
    })

    // console.log({ injectedProvider })
    setTabValue(prev => prev)
    // eslint-disable-next-line
  }, [appDispatch])

  // const loadWeb3ModalGoerli = useCallback(async () => {
  //   if (typeof window.ethereum === 'undefined') {
  //     // console.log('MetaMask is not installed!')
  //     displayToast()
  //     // metamask not installed
  //     return
  //   }
  //   const provider = window.ethereum
  //   // @ts-ignore
  //   // setInjectedProvider(new ethers.providers.Web3Provider(window.ethereum))
  //   appDispatch({ actionType: APPSTATEACTION.GOERLICHAINID })

  //   provider.on('chainChanged', chainId => {
  //     console.log(`chain changed to ${chainId}! updating providers`)
  //     // @ts-ignore
  //     appDispatch({ actionType: APPSTATEACTION.GOERLICHAINID })
  //   })

  //   provider.on('accountsChanged', () => {
  //     console.log(`account changed!`)
  //     // @ts-ignore
  //     appDispatch({ actionType: APPSTATEACTION.GOERLICHAINID })
  //   })

  //   // Subscribe to session disconnection
  //   provider.on('disconnect', (code, reason) => {
  //     console.log(code, reason)
  //     logoutOfWeb3Modal()
  //   })

  //   // console.log({ injectedProvider })
  //   setTabValue(prev => prev)
  //   // eslint-disable-next-line
  // }, [appDispatch])

  /* END - SETUP METAMASK */

  /* SETUP MAINNET & OPTIMISM provider */
  const targetProvider = appState.provider
  const selectedChainId = appState.chainId
  const userSigner = targetProvider.getSigner()
  /* END - SETUP MAINNET & OPTIMISM provider */
  const contextPayload = {
    localProvider,
    mainnet,
    targetProvider,
    selectedChainId,
    address,
    setAddress,
    connectedAddress,
    setConnectedAddress,
    contractConfig,
    externalContracts,
    contractRef,
    switchToOptimism,
    price,
    targetNetwork,
    loadWeb3Modal,
    logoutOfWeb3Modal,
    userSigner,
  }

  return (
    <div className="App">
      <BadgeContext.Provider value={contextPayload}>
        <Layout tabValue={tabValue} setTabValue={setTabValue}>
          {loaded && tabValue === 0 && <BrowseBadges />}

          {tabValue === 1 && (
            <MintingPage
              // @ts-ignore
              tabValue={tabValue}
              setTabValue={setTabValue}
              // injectedProvider={injectedProvider}
            />
          )}
          <Toast
            showToast={showToast}
            closeToast={closeToast}
            snackBarAction={snackBarAction}
            message={'MetaMask   is not installed!'}
          />
        </Layout>
      </BadgeContext.Provider>
    </div>
  )
}

export default App
