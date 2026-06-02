__attribute__((import_module("env"), import_name("host_display")))
extern int host_display(const char *ptr, int len);

__attribute__((import_module("env"), import_name("host_log")))
extern int host_log(const char *ptr, int len);

#define S(s) s, sizeof(s) - 1

int run(void) {
    host_log(S("C agent: got result 100\n"));
    host_display(S("<div class=\"client\"><h3>SampleClientAgent (C)</h3><p>10 * 10 = <b>100</b></p></div>"));
    return 100;
}
