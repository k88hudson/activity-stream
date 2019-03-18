import {CardGrid} from "content-src/components/DiscoveryStreamComponents/CardGrid/CardGrid";
import {connect} from "react-redux";
import {DSMessage} from "content-src/components/DiscoveryStreamComponents/DSMessage/DSMessage";
import {Hero} from "content-src/components/DiscoveryStreamComponents/Hero/Hero";
import {HorizontalRule} from "content-src/components/DiscoveryStreamComponents/HorizontalRule/HorizontalRule";
import {List} from "content-src/components/DiscoveryStreamComponents/List/List";
import {Navigation} from "content-src/components/DiscoveryStreamComponents/Navigation/Navigation";
import React from "react";
import {SectionTitle} from "content-src/components/DiscoveryStreamComponents/SectionTitle/SectionTitle";
import {selectLayoutRender} from "content-src/lib/selectLayoutRender";
import {TopSites} from "content-src/components/DiscoveryStreamComponents/TopSites/TopSites";

const ALLOWED_CSS_URL_PREFIXES = ["chrome://", "resource://", "https://img-getpocket.cdn.mozilla.net/"];
const DUMMY_CSS_SELECTOR = "DUMMY#CSS.SELECTOR";

/**
 * Validate a CSS declaration. The values are assumed to be normalized by CSSOM.
 */
export function isAllowedCSS(property, value) {
  // Bug 1454823: INTERNAL properties, e.g., -moz-context-properties, are
  // exposed but their values aren't resulting in getting nothing. Fortunately,
  // we don't care about validating the values of the current set of properties.
  if (value === undefined) {
    return true;
  }

  // Make sure all urls are of the allowed protocols/prefixes
  const urls = value.match(/url\("[^"]+"\)/g);
  return !urls || urls.every(url => ALLOWED_CSS_URL_PREFIXES.some(prefix =>
    url.slice(5).startsWith(prefix)));
}

export class _DiscoveryStreamBase extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onStyleMount = this.onStyleMount.bind(this);
  }

  onStyleMount(style) {
    // Unmounting style gets rid of old styles, so nothing else to do
    if (!style) {
      return;
    }

    const {sheet} = style;
    const styles = JSON.parse(style.dataset.styles);
    styles.forEach((row, rowIndex) => {
      row.forEach((component, componentIndex) => {
        // Nothing to do without optional styles overrides
        if (!component) {
          return;
        }

        Object.entries(component).forEach(([selectors, declarations]) => {
          // Start with a dummy rule to validate declarations and selectors
          sheet.insertRule(`${DUMMY_CSS_SELECTOR} {}`);
          const [rule] = sheet.cssRules;

          // Validate declarations and remove any offenders. CSSOM silently
          // discards invalid entries, so here we apply extra restrictions.
          rule.style = declarations;
          [...rule.style].forEach(property => {
            const value = rule.style[property];
            if (!isAllowedCSS(property, value)) {
              console.error(`Bad CSS declaration ${property}: ${value}`); // eslint-disable-line no-console
              rule.style.removeProperty(property);
            }
          });

          // Set the actual desired selectors scoped to the component
          const prefix = `.ds-layout > .ds-column:nth-child(${rowIndex + 1}) .ds-column-grid > :nth-child(${componentIndex + 1})`;
          // NB: Splitting on "," doesn't work with strings with commas, but
          // we're okay with not supporting those selectors
          rule.selectorText = selectors.split(",").map(selector => prefix +
            // Assume :pseudo-classes are for component instead of descendant
            (selector[0] === ":" ? "" : " ") + selector).join(",");

          // CSSOM silently ignores bad selectors, so we'll be noisy instead
          if (rule.selectorText === DUMMY_CSS_SELECTOR) {
            console.error(`Bad CSS selector ${selectors}`); // eslint-disable-line no-console
          }
        });
      });
    });
  }

  renderComponent(component, embedWidth) {
    switch (component.type) {
      case "TopSites":
        return (<TopSites header={component.header} />);
      case "Message":
        return (
          <DSMessage
            title={component.header && component.header.title}
            subtitle={component.header && component.header.subtitle}
            link_text={component.header && component.header.link_text}
            link_url={component.header && component.header.link_url}
            icon={component.header && component.header.icon} />
        );
      case "SectionTitle":
        return (
          <SectionTitle
            header={component.header} />
        );
      case "Navigation":
        return (
          <Navigation
            links={component.properties.links}
            alignment={component.properties.alignment}
            header={component.header} />
        );
      case "CardGrid":
        return (
          <CardGrid
            title={component.header && component.header.title}
            data={component.data}
            feed={component.feed}
            border={component.properties.border}
            type={component.type}
            dispatch={this.props.dispatch}
            items={component.properties.items} />
        );
      case "Hero":
        return (
          <Hero
            subComponentType={embedWidth >= 9 ? `cards` : `list`}
            feed={component.feed}
            title={component.header && component.header.title}
            data={component.data}
            border={component.properties.border}
            type={component.type}
            dispatch={this.props.dispatch}
            items={component.properties.items} />
        );
      case "HorizontalRule":
        return (<HorizontalRule />);
      case "List":
        return (
          <List
            data={component.data}
            fullWidth={component.properties.full_width}
            hasBorders={component.properties.border === "border"}
            hasImages={component.properties.has_images}
            hasNumbers={component.properties.has_numbers}
            items={component.properties.items}
            type={component.type}
            header={component.header} />
        );
      default:
        return (<div>{component.type}</div>);
    }
  }

  renderStyles(styles) {
    // Use json string as both the key and styles to render so React knows when
    // to unmount and mount a new instance for new styles.
    const json = JSON.stringify(styles);
    return (<style key={json} data-styles={json} ref={this.onStyleMount} />);
  }

  componentWillReceiveProps(oldProps) {
    if (this.props.layout !== oldProps.layout) {
      delete this.rickRollCache;
    }
  }

  addSpocsAndPositions(state) {
    const {layout, feeds, spocs} = state;
    let spocIndex = 0;

    function maybeInjectSpocs(data, spocsConfig) {
      if (data &&
          spocsConfig && spocsConfig.positions && spocsConfig.positions.length &&
          spocs.data.spocs && spocs.data.spocs.length) {
        const recommendations = [...data.recommendations];
        for (let position of spocsConfig.positions) {

          if (!this.layoutCache) {
            this.rickRollCache[position] = Math.random();
          }

          if (spocs.data.spocs[spocIndex] && this.rickRollCache[position] <= spocsConfig.probability) {
            recommendations.splice(position.index, 0, spocs.data.spocs[spocIndex++]);
          }
        }

        return {
          ...data,
          recommendations,
        };
      }

      return data;
    }

    const positions = {};

    return layout.map(row => ({
      ...row,

      // Loops through all the components and adds a .data property
      // containing data from feeds
      components: row.components.map(component => {
        if (!component.feed || !feeds.data[component.feed.url]) {
          return component;
        }

        positions[component.type] = positions[component.type] || 0;

        let {data} = feeds.data[component.feed.url];

        if (component && component.properties && component.properties.offset) {
          data = {
            ...data,
            recommendations: data.recommendations.slice(component.properties.offset),
          };
        }

        data = maybeInjectSpocs(data, component.spocs);

        let items = 0;
        if (component.properties && component.properties.items) {
          items = Math.min(component.properties.items, data.recommendations.length);
        }

        // loop through a component items
        // Store the items position sequentially for multiple components of the same type.
        // Example: A second card grid starts pos offset from the last card grid.
        for (let i = 0; i < items; i++) {
          data.recommendations[i].pos = positions[component.type]++;
        }

        return {...component, data};
      }),
    }));
  }

  render() {
    const layoutRender = this.addSpocsAndPositions(this.props.DiscoveryStream);

    const styles = [];
    const {spocs, feeds} = this.props.DiscoveryStream;

    if (!spocs.loaded || !feeds.loaded) {
      return null;
    }

    return (
      <div className="discovery-stream ds-layout">
        {layoutRender.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className={`ds-column ds-column-${row.width}`}>
            <div className="ds-column-grid">
              {row.components.map((component, componentIndex) => {
                styles[rowIndex] = [...styles[rowIndex] || [], component.styles];
                return (<div key={`component-${componentIndex}`}>
                  {this.renderComponent(component, row.width)}
                </div>);
              })}
            </div>
          </div>
        ))}
        {this.renderStyles(styles)}
      </div>
    );
  }
}

function transform(state) {
  return {
    DiscoveryStream: {
      ...state.DiscoveryStream,
      layoutRender: selectLayoutRender({
        ...state,
        rolls: selectRolls(state)
      }),
    },
  };
}

export const DiscoveryStreamBase = connect(transform)(_DiscoveryStreamBase);
