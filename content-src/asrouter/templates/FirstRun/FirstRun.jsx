import React, {useEffect, useState} from "react";
import {Interrupt} from "./Interrupt";
import {Triplets} from "./Triplets";
import { actionCreators as ac, actionTypes as at } from "common/Actions.jsm";
import {addUtmParams} from "./addUtmParams";

const FLUENT_FILES = [
  "branding/brand.ftl",
  "browser/branding/brandings.ftl",
  "browser/branding/sync-brand.ftl",
  "browser/newtab/onboarding.ftl",
];

const initialState = {
  isInterruptVisble: false,
  isTripletsContainerVisible: true,
  isTripletsContentVisible: false
};

let didAddFluent = false;

export const FirstRun = props => {
  const { interrupt, triplets, sendUserActionTelemetry, fxaEndpoint, dispatch, executeAction} = props;
  const hasInterrupt = Boolean(props.interrupt);
  const hasTriplets = Boolean(props.triplets && props.triplets.length);
  const UTMTerm = interrupt.utm_term;

  // This needs to run *before* the first render
  if (!didAddFluent) {
    FLUENT_FILES.forEach(file => {
      const link = document.head.appendChild(document.createElement("link"));
      link.href = file;
      link.rel = "localization";
    });
    didAddFluent = true;
  }

  useEffect(() => {
    // We need to remove hide-main since we should show it underneath everything that has rendered
    document.body.classList.remove("hide-main");
  }, []);

  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState({
      isInterruptVisble: hasInterrupt,
      isTripletsContainerVisible: hasTriplets,
      isTripletsContentVisible: false,
    });
    if (!hasInterrupt) {
      document.body.classList.remove("welcome");
    }

  }, [interrupt, triplets, hasInterrupt, hasTriplets]);

  const [flowParams, setFlowParams] = useState();
  useEffect(() => {
    if (fxaEndpoint && UTMTerm) {
      const effect = async () => {
        try {
          const url = new URL(`${fxaEndpoint}/metrics-flow?entrypoint=activity-stream-firstrun&form_type=email`);
          addUtmParams(url, UTMTerm);
          const response = await fetch(url, {credentials: "omit"});
          if (response.status === 200) {
            const {deviceId, flowId, flowBeginTime} = await response.json();
            setFlowParams({deviceId, flowId, flowBeginTime});
          } else {
            dispatch(ac.OnlyToMain({type: at.TELEMETRY_UNDESIRED_EVENT, data: {event: "FXA_METRICS_FETCH_ERROR", value: response.status}}));
          }
        } catch (error) {
          dispatch(ac.OnlyToMain({type: at.TELEMETRY_UNDESIRED_EVENT, data: {event: "FXA_METRICS_ERROR"}}));
        }
      };
      effect();
    }
  }, [fxaEndpoint, UTMTerm, dispatch])

  const {
    isInterruptVisble,
    isTripletsContainerVisible,
    isTripletsContentVisible
  } = state;

  const closeInterrupt = () => setState({
    isInterruptVisble: false,
    isTripletsContainerVisible: hasTriplets,
    isTripletsContentVisible: hasTriplets,
  });

  const closeTriplets = () => setState({ isTripletsContainerVisible: false });
  return (
    <>
      {isInterruptVisble ? (
        <Interrupt
          document={global.document}
          message={interrupt}
          onNextScene={closeInterrupt}
          addUtmParams={url => addUtmParams(url, UTMTerm, false)}
          sendUserActionTelemetry={sendUserActionTelemetry}
          dispatch={dispatch}
          flowParams={flowParams}
          fxaEndpoint={fxaEndpoint}
        />
      ) : null}
      {hasTriplets ? (
        <Triplets
          document={global.document}
          cards={triplets}
          showCardPanel={isTripletsContainerVisible}
          showContent={isTripletsContentVisible}
          hideContainer={closeTriplets}
          sendUserActionTelemetry={sendUserActionTelemetry}
          addUtmParams={url => addUtmParams(url, UTMTerm, true)}
          flowParams={flowParams}
          onAction={executeAction}
        />
      ) : null}
    </>
  );
}