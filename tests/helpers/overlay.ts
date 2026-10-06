/** An overlay that draws nothing: every method the player calls, as a no-op. Tests spread their own spies over it. */
export const overlayStub = () => ({
  showCaption() {}, hideCaption() {}, year() {}, showTitle() {}, moveTitle() {}, credit() {}, closingCredit() {}, hideCards() {},
  insert() {}, location() {}, hideLocation() {}, standby() {}, osd() {},
});
