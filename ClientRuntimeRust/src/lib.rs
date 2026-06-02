#![no_std]

use core::fmt::Write;

#[cfg(feature = "display")]
extern "C" {
    #[link_name = "host_display"]
    fn host_display_raw(ptr: *const u8, len: usize) -> i32;
}

#[cfg(feature = "log")]
extern "C" {
    #[link_name = "host_log"]
    fn host_log_raw(ptr: *const u8, len: usize) -> i32;
}

#[cfg(any(feature = "display", feature = "log"))]
struct Buf<'a>(&'a mut [u8], usize);

#[cfg(any(feature = "display", feature = "log"))]
impl<'a> Write for Buf<'a> {
    fn write_str(&mut self, s: &str) -> core::fmt::Result {
        let bytes = s.as_bytes();
        if self.1 + bytes.len() > self.0.len() {
            return Err(core::fmt::Error);
        }
        self.0[self.1..self.1 + bytes.len()].copy_from_slice(bytes);
        self.1 += bytes.len();
        Ok(())
    }
}

#[cfg(any(feature = "display", feature = "log"))]
fn build(buf: &mut [u8], args: core::fmt::Arguments) -> usize {
    let mut w = Buf(buf, 0);
    w.write_fmt(args).unwrap();
    w.1
}

#[cfg(feature = "display")]
pub fn display(args: core::fmt::Arguments) -> i32 {
    let mut buf = [0u8; 4096];
    let n = build(&mut buf, args);
    unsafe { host_display_raw(buf.as_ptr(), n) }
}

#[cfg(feature = "log")]
pub fn log(args: core::fmt::Arguments) -> i32 {
    let mut buf = [0u8; 4096];
    let n = build(&mut buf, args);
    unsafe { host_log_raw(buf.as_ptr(), n) }
}

#[macro_export]
macro_rules! display {
    ($fmt:literal $(, $arg:expr)* $(,)?) => {
        $crate::display(core::format_args!($fmt $(, $arg)*))
    };
}

#[macro_export]
macro_rules! log {
    ($fmt:literal $(, $arg:expr)* $(,)?) => {
        $crate::log(core::format_args!($fmt $(, $arg)*))
    };
}
