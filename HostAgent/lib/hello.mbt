pub fn run() -> Int {
  let (clients, rc) = @hostruntime.get_clients()
  if rc < 0 { return rc }
  if clients.length() <= 0 { return 99 }
  let handles: Array[Int] = []
  let mut i = 0
  while i < clients.length() {
    handles.push(@hostruntime.run_client_async(clients[i]))
    i = i + 1
  }
  let _ = @hostruntime.await_clients(handles)
  let results: Array[Int] = []
  let mut j = 0
  while j < handles.length() {
    results.push(@hostruntime.get_result(handles[j]))
    j = j + 1
  }
  let first = results[0]
  let mut html = "<div class=\"host\"><h3>HostAgent (Moonbit)</h3><p>Results:</p><ul>"
  let mut k = 0
  while k < clients.length() {
    html = html + "<li>" + clients[k] + ": " + results[k].to_string() + "</li>"
    k = k + 1
  }
  html = html + "</ul></div>"
  let _ = @hostruntime.display(html)
  first
}
