// Far from UTC on purpose: local midnight is the previous UTC day, so any
// `toISOString().slice(0, 10)` shortcut for a calendar date fails a test.
module.exports = async () => {
  process.env.TZ = "Asia/Tokyo";
};
