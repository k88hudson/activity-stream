const React = require("react");
const SiteIcon = require("components/SiteIcon/SiteIcon");
const DEFAULT_LENGTH = 6;
const {toRGBString, prettyUrl} = require("lib/utils");

const TopSites = React.createClass({
  getDefaultProps() {
    return {length: DEFAULT_LENGTH};
  },
  render() {
    const sites = this.props.sites.slice(0, this.props.length);
    const blankSites = [];
    for (let i = 0; i < (this.props.length - sites.length); i++) {
      blankSites.push(<div className="tile tile-placeholder" key={`blank-${i}`} />);
    }
    return (<section className="top-sites">
      <h3 className="section-title">Top Sites</h3>
      <div className="tiles-wrapper">
        {sites.map((site) => {
          let title;
          let color;
          try {
            title = site.parsedUrl.hostname.replace("www.", "");
          } catch (e) {
            title = site.provider_name || site.title;
          }
          try {
            color = site.favicon_colors[0].color;
          } catch (e) {
            color = [333, 333, 333];
          }
          const backgroundColor = toRGBString(...color, 0.8);
          return (<a key={site.url} className="tile" href={site.url} style={{backgroundColor}}>
            <div className="inner-border" />
            <div className="tile-img-container">
              <SiteIcon site={site} width={32} height={32} />
            </div>
            <div className="tile-title">{title}</div>
          </a>);
        })}
        {blankSites}
      </div>
    </section>);
  }
});

TopSites.propTypes = {
  length: React.PropTypes.number,
  sites: React.PropTypes.arrayOf(
    React.PropTypes.shape({
      images: React.PropTypes.array,
      icons: React.PropTypes.array,
      url: React.PropTypes.string.isRequired,
      type: React.PropTypes.string,
      description: React.PropTypes.string,
      provider_name: React.PropTypes.string,
      parsedUrl: React.PropTypes.object
    })
  ).isRequired
};

module.exports = TopSites;
