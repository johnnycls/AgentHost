fn host_get_clients(ptr: Int, len_ptr: Int) -> Int = "env" "host_get_clients"
fn host_display(ptr: Int, len: Int) -> Int = "env" "host_display"
fn host_run_client_async(ptr: Int, len: Int) -> Int = "env" "host_run_client_async"
fn host_await_clients(ptr: Int, count: Int) -> Int = "env" "host_await_clients"
fn host_get_result(handle: Int) -> Int = "env" "host_get_result"

pub fn display(s: String) -> Int {
  let buf = scratch_off()
  let p = write_raw_str(buf, s)
  host_display(buf, p - buf)
}

pub fn get_clients() -> (Array[String], Int) {
  let buf = scratch_off()
  let rc = host_get_clients(buf, buf + 4092)
  if rc < 0 { return ([], rc) }
  let n = load_i32(buf)
  if n <= 0 { return ([], 99) }
  let entry_base = buf + 4
  let names: Array[String] = []
  let mut entry_off = 0
  let mut idx = 0
  while idx < n {
    let name_len = load_i32(entry_base + entry_off)
    let name_ptr = entry_base + entry_off + 4
    names.push(read_str(name_ptr, name_len))
    entry_off = entry_off + 4 + name_len
    idx = idx + 1
  }
  (names, 0)
}

fn read_str(ptr: Int, len: Int) -> String {
  let mut s = ""
  let mut i = 0
  while i < len {
    s = s + Int::unsafe_to_char(load_byte(ptr + i)).to_string()
    i = i + 1
  }
  s
}

pub fn run_client_async(name: String) -> Int {
  let buf = scratch_off()
  let p = write_raw_str(buf, name)
  host_run_client_async(buf, p - buf)
}

pub fn await_clients(handles: Array[Int]) -> Int {
  let base = handles_off()
  let mut i = 0
  while i < handles.length() {
    let _ = store_i32(base + i * 4, handles[i])
    i = i + 1
  }
  host_await_clients(base, handles.length())
}

pub fn get_result(handle: Int) -> Int {
  host_get_result(handle)
}
