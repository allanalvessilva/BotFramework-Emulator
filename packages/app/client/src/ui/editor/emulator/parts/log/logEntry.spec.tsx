//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import * as React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import LogLevel from '@bfemulator/emulator-core/lib/types/log/level';
import { textItem } from '@bfemulator/emulator-core/lib/types/log/util';
import {
  number2,
  timestamp,
  LogEntry,
  LogEntryProps
} from './logEntry';
import { LogEntry as LogEntryContainer } from './logEntryContainer';
import { SharedConstants } from '@bfemulator/app-shared';
import { setInspectorObjects } from '../../../../../data/action/chatActions';

jest.mock('../../../../dialogs', () => ({
  BotCreationDialog: () => ({})
}));

jest.mock('./log.scss', () => ({}));

let mockRemoteCallsMade;
let mockCallsMade;
jest.mock('../../../../../platform/commands/commandServiceImpl', () => ({
  CommandServiceImpl: {
    call: (commandName, ...args) => {
      mockCallsMade.push({ commandName, args });
      return Promise.resolve(true);
    },
    remoteCall: (commandName, ...args) => {
      mockRemoteCallsMade.push({ commandName, args });
      return Promise.resolve(true);
    }
  }
}));

describe('logEntry component', () => {
  let wrapper: ReactWrapper;
  let node;
  let instance;
  let props: LogEntryProps;
  let mockNext;
  let mockSelectedActivity;
  let mockSetInspectorObjects;
  let mockDispatch;

  beforeEach(() => {
    mockNext = jest.fn(() => null);
    mockSelectedActivity = { next: mockNext };
    mockSetInspectorObjects = jest.fn(() => null);
    mockRemoteCallsMade = [];
    mockCallsMade = [];
    props = {
      document: {
        documentId: 'someDocId',
        selectedActivity$: mockSelectedActivity
      },
      entry: {
        timestamp: 0,
        items: []
      },
      setInspectorObjects: mockSetInspectorObjects
    };
    const mockStore = createStore((_state, _action) => ({}));
    mockDispatch = jest.spyOn(mockStore, 'dispatch');
    wrapper = mount(
      <Provider store={ mockStore }>
        <LogEntryContainer { ...props }/>
      </Provider>
    );
    node = wrapper.find(LogEntry);
    instance = node.instance();
  });

  it('should render an outer entry component', () => {
    expect(node.find('div')).toHaveLength(1);
  });

  it('should render a timestamped log entry with multiple items', () => {
    const entry = {
      timestamp: new Date(2018, 1, 1, 12, 34, 56).getTime(),
      items: [
        textItem(LogLevel.Debug, 'item1'),
        textItem(LogLevel.Debug, 'item2'),
        textItem(LogLevel.Debug, 'item3'),
      ],
    };
    wrapper = mount(<LogEntry { ...props }/>);
    wrapper.setProps({ entry });
    expect(wrapper.find('span.timestamp')).toHaveLength(1);
    expect(wrapper.find('span.text-item')).toHaveLength(3);

    const timestampNode = wrapper.find('span.timestamp');
    expect(timestampNode.html()).toContain('12:34:56');
  });

  it('should truncate a number of more than 3 digits to 2 digits', () => {
    const num1 = 5;
    const num2 = 34;
    const num3 = 666;

    expect(number2(num1)).toBe('05');
    expect(number2(num2)).toBe('34');
    expect(number2(num3)).toBe('66');
  });

  it('should properly generate a timestamp', () => {
    const time = Date.now();
    const date = new Date(time);
    const expectedHrs = number2(date.getHours());
    const expectedMins = number2(date.getMinutes());
    const expectedSeconds = number2(date.getSeconds());
    const expectedTimestamp = `${expectedHrs}:${expectedMins}:${expectedSeconds}`;

    expect(timestamp(time)).toBe(expectedTimestamp);
  });

  it('should inspect an object', () => {
    const mockInspectableObj = { some: 'data' };
    instance.inspect(mockInspectableObj);

    expect(mockNext).toHaveBeenCalledWith({ showInInspector: true });
    expect(mockDispatch).toHaveBeenCalledWith(setInspectorObjects('someDocId', mockInspectableObj));
  });

  it('should inspect and highlight an object', () => {
    const mockInspectableObj = { some: 'data', type: 'message', id: 'someId' };
    instance.inspectAndHighlightInWebchat(mockInspectableObj);

    expect(mockNext).toHaveBeenCalledWith({ ...mockInspectableObj, showInInspector: true });
    expect(mockRemoteCallsMade).toHaveLength(1);
    expect(mockRemoteCallsMade[0].commandName).toBe(SharedConstants.Commands.Telemetry.TrackEvent);
    expect(mockRemoteCallsMade[0].args).toEqual(['log_inspectActivity', { type: 'message' }]);

    mockInspectableObj.type = undefined;
    instance.inspectAndHighlightInWebchat(mockInspectableObj);

    expect(mockRemoteCallsMade[1].args).toEqual(['log_inspectActivity', { type: '' }]);
  });

  it('should highlight an object', () => {
    const mockInspectableObj = { some: 'data', type: 'message', id: 'someId' };
    instance.highlightInWebchat(mockInspectableObj);

    expect(mockNext).toHaveBeenCalledWith({ ...mockInspectableObj, showInInspector: false });
  });

  it('should remove highlighting from an object', () => {
    const mockInspectableObj = { id: 'activity1' };
    wrapper = mount(<LogEntry {...props}/>);
    const mockCurrentlyInspectedActivity = { id: 'activity2' };
    wrapper.setProps({ currentlyInspectedActivity: mockCurrentlyInspectedActivity });
    instance = wrapper.instance();
    instance.removeHighlightInWebchat(mockInspectableObj);

    expect(mockNext).toHaveBeenCalledWith({ ...mockCurrentlyInspectedActivity, showInInspector: true });

    mockCurrentlyInspectedActivity.id = undefined;
    instance.removeHighlightInWebchat(mockInspectableObj);

    expect(mockNext).toHaveBeenCalledWith({ showInInspector: false });
  });

  it('should render a text item', () => {
    wrapper = mount(<LogEntry {...props}/>);
    instance = wrapper.instance();
    const textElem = instance.renderItem(
      { type: 'text', payload: { level: LogLevel.Debug, text: 'some text' }},
      'someKey'
    );
    expect(textElem).not.toBeNull();
  });

  it('should render an external link item', () => {
    wrapper = mount(<LogEntry {...props}/>);
    instance = wrapper.instance();
    const linkItem = instance.renderItem(
      { type: 'external-link', payload: { hyperlink: 'https://aka.ms/bf-emulator', text: 'some text' }},
      'someKey'
    );
    expect(linkItem).not.toBeNull();
  });

  it('should render an app settings item', () => {
    wrapper = mount(<LogEntry {...props}/>);
    instance = wrapper.instance();
    const appSettingsItem = instance.renderItem(
      { type: 'open-app-settings', payload: { text: 'some text' }},
      'someKey'
    );
    expect(appSettingsItem).not.toBeNull();
  });

  it('should render an exception item', () => {
    wrapper = mount(<LogEntry {...props}/>);
    instance = wrapper.instance();
    const exceptionItem = instance.renderItem(
      { type: 'exception', payload: { err: 'some error' }},
      'someKey'
    );
    expect(exceptionItem).not.toBeNull();
  });

  it('should render an inspectable object item', () => {
    wrapper = mount(<LogEntry {...props}/>);
    instance = wrapper.instance();
    const inspectableObjItem = instance.renderItem(
      { type: 'inspectable-object', payload: { obj: { id: 'someId', type: 'message' } }},
      'someKey'
    );
    expect(inspectableObjItem).not.toBeNull();
    expect(instance.inspectableObjects.someId).toBe(true);
  });

  it('should render a network request item', () => {
    wrapper = mount(<LogEntry {...props}/>);
    instance = wrapper.instance();
    const networkReqItem = instance.renderItem(
      {
        type: 'network-request',
        payload: {
          facility: undefined,
          body: { some: 'data' },
          headers: undefined,
          method: 'GET',
          url: undefined
        }
      },
      'someKey'
    );
    expect(networkReqItem).not.toBeNull();
  });

  it('should render a network response item', () => {
    wrapper = mount(<LogEntry {...props}/>);
    instance = wrapper.instance();
    const networkResItem = instance.renderItem(
      {
        type: 'network-response',
        payload: {
          body: { some: 'data' },
          headers: undefined,
          statusCode: 404,
          statusMessage: undefined,
          srcUrl: undefined
        }
      },
      'someKey'
    );
    expect(networkResItem).not.toBeNull();
  });

  it('should render an ngrok expiration item', () => {
    wrapper = mount(<LogEntry {...props}/>);
    instance = wrapper.instance();
    const ngrokitem = instance.renderItem(
      { type: 'ngrok-expiration', payload: { text: 'some text' }},
      'someKey'
    );
    expect(ngrokitem).not.toBeNull();
  });
});
