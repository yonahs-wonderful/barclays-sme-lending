/* Presentation-only confirmation. Elapsed time is not CoreBank verification. */
(function () {
  window.createDemoConfirmation = function (onMessage) {
    const scheduled = new Map();
    return {
      schedule(card) {
        if (card.type !== 'claim_lodged' || !card.data?.task_id || !card.data?.claim_ref) return;
        const { task_id, claim_ref } = card.data;
        if (scheduled.has(task_id)) return;
        scheduled.set(task_id, setTimeout(() => onMessage({
          id: 'demo-confirmation:' + task_id,
          kind: 'message', speaker: 'agent', demoConfirmation: true,
          text: 'James, your application has been entered into CoreBank successfully. Your reference is ' + claim_ref + '.'
        }), 10 * 60 * 1000));
      },
      dispose() { scheduled.forEach(clearTimeout); scheduled.clear(); }
    };
  };
})();
