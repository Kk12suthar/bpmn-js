import { expect } from 'chai';

import {
  bootstrapModeler,
  inject
} from 'test/TestHelper';

import coreModule from 'lib/core';
import modelingModule from 'lib/features/modeling';
import customRulesModule from '../../../util/custom-rules';
import { getDi } from 'lib/util/ModelUtil';


describe('features/modeling - reverse sequence flow', function() {

  var diagramXML = require('../../../fixtures/bpmn/reverse-sequence-flow.bpmn');

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [
      coreModule,
      modelingModule,
      customRulesModule
    ]
  }));


  it('should reverse a sequence flow', inject(function(elementRegistry, modeling) {

    // given
    var connection = elementRegistry.get('SequenceFlow_Reverse'),
        source = elementRegistry.get('Task_Source'),
        target = elementRegistry.get('Task_Target'),
        di = getDi(connection),
        oldWaypoints = connection.waypoints.slice(),
        reversedWaypoints = oldWaypoints.slice().reverse(),
        conditionExpression = connection.businessObject.conditionExpression,
        defaultFlow = source.businessObject.default,
        targetDefaultFlow = target.businessObject.default,
        oldLabelBounds = {
          x: connection.label.x,
          y: connection.label.y
        };

    // when
    modeling.reverse(connection);

    // then
    expect(connection.source).to.equal(target);
    expect(connection.target).to.equal(source);
    expect(connection.businessObject.sourceRef).to.equal(target.businessObject);
    expect(connection.businessObject.targetRef).to.equal(source.businessObject);
    expect(connection.source.outgoing).to.include(connection);
    expect(connection.target.incoming).to.include(connection);
    expect(source.outgoing).not.to.include(connection);
    expect(target.incoming).not.to.include(connection);
    expect(connection).to.have.waypoints(reversedWaypoints);
    expect(connection).to.have.diWaypoints(reversedWaypoints);
    expect(di.sourceElement).to.equal(getDi(target));
    expect(di.targetElement).to.equal(getDi(source));
    expect(connection.businessObject.conditionExpression).not.to.exist;
    expect(source.businessObject.default).not.to.exist;
    expect(target.businessObject.default).to.equal(targetDefaultFlow);
    expect(connection.label).to.include(oldLabelBounds);
    expect(conditionExpression).to.exist;
    expect(defaultFlow).to.equal(connection.businessObject);
  }));


  it('should undo and redo as one operation', inject(function(elementRegistry, modeling, commandStack) {

    // given
    var connection = elementRegistry.get('SequenceFlow_Reverse'),
        source = elementRegistry.get('Task_Source'),
        target = elementRegistry.get('Task_Target'),
        di = getDi(connection),
        oldWaypoints = connection.waypoints.slice(),
        oldSourceElement = di.sourceElement,
        oldTargetElement = di.targetElement,
        oldConditionExpression = connection.businessObject.conditionExpression,
        oldDefaultFlow = source.businessObject.default,
        oldTargetDefaultFlow = target.businessObject.default;

    // when
    modeling.reverse(connection);
    commandStack.undo();

    // then
    expect(connection.source).to.equal(source);
    expect(connection.target).to.equal(target);
    expect(connection.businessObject.sourceRef).to.equal(source.businessObject);
    expect(connection.businessObject.targetRef).to.equal(target.businessObject);
    expect(connection).to.have.waypoints(oldWaypoints);
    expect(connection).to.have.diWaypoints(oldWaypoints);
    expect(di.sourceElement).to.equal(oldSourceElement);
    expect(di.targetElement).to.equal(oldTargetElement);
    expect(connection.businessObject.conditionExpression).to.equal(oldConditionExpression);
    expect(source.businessObject.default).to.equal(oldDefaultFlow);
    expect(target.businessObject.default).to.equal(oldTargetDefaultFlow);

    // when
    commandStack.redo();

    // then
    expect(connection.source).to.equal(target);
    expect(connection.target).to.equal(source);
    expect(connection).to.have.waypoints(oldWaypoints.slice().reverse());
    expect(connection).to.have.diWaypoints(oldWaypoints.slice().reverse());
    expect(connection.businessObject.conditionExpression).not.to.exist;
    expect(source.businessObject.default).not.to.exist;
    expect(target.businessObject.default).to.equal(oldTargetDefaultFlow);
  }));


  it('should reverse a self-loop and restore its default on undo', inject(function(elementRegistry, modeling, commandStack) {

    // given
    var connection = elementRegistry.get('SequenceFlow_Loop'),
        source = elementRegistry.get('Task_Loop'),
        oldWaypoints = connection.waypoints.slice(),
        oldDefaultFlow = source.businessObject.default;

    // when
    modeling.reverse(connection);

    // then
    expect(connection).to.have.waypoints(oldWaypoints.slice().reverse());
    expect(source.businessObject.default).not.to.exist;

    // when
    commandStack.undo();

    // then
    expect(connection).to.have.waypoints(oldWaypoints);
    expect(source.businessObject.default).to.equal(oldDefaultFlow);
  }));


  it('should respect custom reconnect rules', inject(function(elementRegistry, modeling, customRules) {

    // given
    var connection = elementRegistry.get('SequenceFlow_Reverse'),
        source = connection.source,
        target = connection.target;

    customRules.addRule('connection.reconnect', 1500, function() {
      return false;
    });

    // when
    modeling.reverse(connection);

    // then
    expect(connection.source).to.equal(source);
    expect(connection.target).to.equal(target);
  }));


  it('should NOT reverse an invalid sequence flow', inject(function(elementRegistry, modeling) {

    // given
    var connection = elementRegistry.get('SequenceFlow_Invalid'),
        source = connection.source,
        target = connection.target,
        oldWaypoints = connection.waypoints.slice();

    // when
    modeling.reverse(connection);

    // then
    expect(connection.source).to.equal(source);
    expect(connection.target).to.equal(target);
    expect(connection).to.have.waypoints(oldWaypoints);
  }));

});
