import React from "react";
import {OnboardingCard} from "../../templates/OnboardingMessage/OnboardingMessage";

export class Triplets extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onCardAction = this.onCardAction.bind(this);
  }
  
  componentWillMount() {
    global.document.body.classList.add("inline-onboarding");
  }

  componentWillUnmount() {
    this.props.document.body.classList.remove("inline-onboarding");
  }

  onCardAction(action) {
    let actionUpdates = {};
    const {flowParams} = this.props;

    if (action.type === "OPEN_URL") {
      let url = new URL(action.data.args);
      this.props.addUtmParams(url);

      if (action.addFlowParams) {
        url.searchParams.append("device_id", flowParams.deviceId);
        url.searchParams.append("flow_id", flowParams.flowId);
        url.searchParams.append("flow_begin_time", flowParams.flowBeginTime);
      }

      actionUpdates = {data: {...action.data, args: url}};
    }

    this.props.onAction({...action, ...actionUpdates});
  }

  render() {
    const {
      cards,
      showCardPanel,
      showContent,
      hideContainer,
      sendUserActionTelemetry,
    } = this.props;

    return (
      <div
        className={`trailheadCards ${
          showCardPanel ? "expanded" : "collapsed"
        }`}>
        <div className="trailheadCardsInner" aria-hidden={!showContent}>
          <h1 data-l10n-id="onboarding-welcome-header" />
          <div className={`trailheadCardGrid${showContent ? " show" : ""}`}>
            {cards.map(card => (
              <OnboardingCard
                key={card.id}
                className="trailheadCard"
                sendUserActionTelemetry={sendUserActionTelemetry}
                onAction={this.onCardAction}
                UISurface="TRAILHEAD"
                {...card}
              />
            ))}
          </div>
          {showCardPanel && (
            <button
              className="icon icon-dismiss"
              onClick={hideContainer}
              data-l10n-id="onboarding-cards-dismiss"
            />
          )}
        </div>
      </div>
    );
  }
}
