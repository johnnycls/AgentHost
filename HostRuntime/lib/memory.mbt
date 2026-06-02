fn scratch_off() -> Int {
  8192
}

fn handles_off() -> Int {
  49152
}

extern "wasm" fn load_i32(ptr: Int) -> Int =
  #|(func (param i32) (result i32) (i32.load (local.get 0)))
extern "wasm" fn load_byte(ptr: Int) -> Int =
  #|(func (param i32) (result i32) (i32.load8_u (local.get 0)))
extern "wasm" fn store_i32(ptr: Int, val: Int) -> Int =
  #|(func (param i32 i32) (result i32) (i32.store (local.get 0) (local.get 1)) (local.get 1))
extern "wasm" fn store_byte(ptr: Int, val: Int) -> Int =
  #|(func (param i32 i32) (result i32) (i32.store8 (local.get 0) (local.get 1)) (i32.add (local.get 0) (i32.const 1)))

fn write_raw_str(pos: Int, s: String) -> Int {
  let mut p = pos
  let mut i = 0
  while i < s.length() {
    p = store_byte(p, s[i].to_int())
    i = i + 1
  }
  p
}
