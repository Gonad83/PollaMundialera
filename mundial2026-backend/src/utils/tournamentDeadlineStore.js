const DEFAULT_DEADLINE = '2026-06-15T19:00:00.000Z';

let _deadline = process.env.TOURNAMENT_DEADLINE || DEFAULT_DEADLINE;

const getDeadline = () => _deadline;
const setDeadline = (isoString) => { _deadline = isoString; };
const isLocked = () => new Date() > new Date(_deadline);

module.exports = { getDeadline, setDeadline, isLocked };
