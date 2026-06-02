fn host_display(ptr: Int, len: Int) -> Int = "env" "host_display"
fn host_log(ptr: Int, len: Int) -> Int = "env" "host_log"

pub extern "wasm" fn scratch_off() -> Int =
  #|(func (result i32) (i32.const 2048))

pub extern "wasm" fn store_byte(ptr: Int, val: Int) -> Int =
  #|(func (param i32 i32) (result i32) (i32.store8 (local.get 0) (local.get 1)) (i32.add (local.get 0) (i32.const 1)))

pub fn display(s: String) -> Int {
  let buf = scratch_off()
  let mut p = buf
  let mut i = 0
  while i < s.length() {
    p = store_byte(p, s[i].to_int())
    i = i + 1
  }
  host_display(buf, p - buf)
}

pub fn log(s: String) -> Int {
  let buf = scratch_off()
  let mut p = buf
  let mut i = 0
  while i < s.length() {
    p = store_byte(p, s[i].to_int())
    i = i + 1
  }
  host_log(buf, p - buf)
}
