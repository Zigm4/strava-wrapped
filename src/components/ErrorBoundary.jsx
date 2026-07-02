import { Component } from 'react'

// Empêche l'écran blanc : si une carte/vue lève une exception au rendu, on affiche
// un message de repli récupérable au lieu de casser toute l'app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Erreur de rendu :', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-screen">
          <h2>Aïe, un pépin d'affichage.</h2>
          <p>Recharge la page. Si le souci persiste, réinitialise via « Changer de source ».</p>
          <button className="btn btn-strava" onClick={() => window.location.reload()}>Recharger</button>
        </div>
      )
    }
    return this.props.children
  }
}
