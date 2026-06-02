pub fn run() -> Int {
  let result = 3 * 14
  let _ = @clientruntime.log("Moonbit log: result = " + result.to_string() + "\n")
  let _ = @clientruntime.display(
    "<div class=\"client\"><h3>SampleClientAgent (Moonbit)</h3><p>3 * 14 = <b>" +
    result.to_string() + "</b></p></div>"
  )
  result
}
