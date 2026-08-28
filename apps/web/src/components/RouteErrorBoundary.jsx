import { Component } from "react";
import { Link } from "react-router-dom";

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("A routed page could not be rendered:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container py-5 text-center" role="alert">
          <h3>This page could not be displayed</h3>
          <p className="text-muted">You can safely return to the home page and continue using MosqueConnect.</p>
          <Link to="/" className="btn btn-mc">Back home</Link>
        </div>
      );
    }

    return this.props.children;
  }
}
