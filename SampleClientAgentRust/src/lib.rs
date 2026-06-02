#![no_std]

use client_runtime::display;

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    loop {}
}

#[inline(never)]
#[no_mangle]
pub extern "C" fn run() -> i32 {
    let result = 7 * 6;
    display!("<div class=\"client\"><h3>SampleClientAgent (Rust)</h3><p>7 * 6 = <b>{}</b></p></div>", result);
    result
}
