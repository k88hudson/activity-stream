import React from 'react';
import { assert } from 'chai';
import { mount } from 'enzyme';
import { spy } from 'sinon';

const Foo = props => {
  return (<div>foo</div>);
};

describe('<Foo />', () => {
  it('calls componentDidMount', () => {
    const wrapper = mount(<Foo />);
    assert.lengthOf(wrapper.find("div"), 1);
  });
});
