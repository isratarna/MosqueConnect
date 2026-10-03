import { Component } from "react";
import { Link } from "react-router-dom";
import { withTranslation } from "react-i18next";

class RouteErrorBoundary extends Component {
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
      const { t } = this.props;

      return (
        <div className="container py-5 text-center" role="alert">
          <h3>{t("error.pageTitle")}</h3>
          <p className="text-muted">{t("error.pageMessage")}</p>
          <Link to="/" className="btn btn-mc">{t("common.backHome")}</Link>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(RouteErrorBoundary);
