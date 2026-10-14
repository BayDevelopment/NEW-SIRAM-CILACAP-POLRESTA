import { Form, Head } from "@inertiajs/react";
import TextLink from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { logout } from "@/routes";
import { send } from "@/routes/verification";

const LOGO_SRC = "/logo-polresta-cilacap-fiks.png";

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Verifikasi Email - SIRAM Polresta Cilacap" />

            <div className="siram-login-page">
                {/* Decorative blobs */}
                <div className="siram-blob siram-blob-one" />
                <div className="siram-blob siram-blob-two" />
                <div className="siram-blob siram-blob-three" />

                {/* Subtle grid */}
                <div className="siram-grid-pattern" />

                <div className="siram-login-container">
                    {/* =========================
                        LEFT SIDE
                    ========================== */}
                    <div className="siram-login-brand">
                        <div className="siram-brand-content">
                            <div className="siram-logo-wrapper">
                                <img
                                    src={LOGO_SRC}
                                    alt="Logo Polresta Cilacap"
                                    className="siram-logo-img"
                                />
                            </div>

                            <div className="siram-brand-label">
                                POLRESTA CILACAP
                            </div>

                            <h1 className="siram-brand-title">SIRAM</h1>

                            <p className="siram-brand-subtitle">
                                Sistem Informasi Rumah Dinas,
                                <br />
                                Asrama, Mes & Apartemen
                            </p>

                            <div className="siram-brand-divider" />

                            <p className="siram-brand-description">
                                Sistem informasi untuk mendukung pengelolaan
                                hunian dinas secara tertib, transparan, dan
                                terintegrasi.
                            </p>

                            <div className="siram-security-badge">
                                <span className="siram-security-dot" />
                                Sistem Internal Polresta Cilacap
                            </div>
                        </div>
                    </div>

                    {/* =========================
                        RIGHT SIDE - VERIFY EMAIL
                    ========================== */}
                    <div className="siram-login-panel">
                        <div className="siram-login-card">
                            <div className="siram-mobile-brand">
                                <img
                                    src={LOGO_SRC}
                                    alt="Logo Polresta Cilacap"
                                    className="siram-mobile-logo"
                                />

                                <div>
                                    <p>POLRESTA CILACAP</p>
                                    <strong>SIRAM</strong>
                                </div>
                            </div>

                            <div className="siram-login-header">
                                <div className="siram-verify-icon">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </div>

                                <span className="siram-welcome">
                                    VERIFIKASI AKUN
                                </span>

                                <h2>Verifikasi Email Anda</h2>

                                <p>
                                    Silakan verifikasi alamat email Anda dengan
                                    mengklik tautan yang baru saja kami kirimkan
                                    ke email Anda.
                                </p>
                            </div>

                            {status === "verification-link-sent" && (
                                <div className="siram-status">
                                    Tautan verifikasi baru telah dikirim ke
                                    alamat email yang Anda daftarkan.
                                </div>
                            )}

                            <Form {...send.form()} className="siram-login-form">
                                {({ processing }) => (
                                    <Button
                                        type="submit"
                                        className="siram-login-button"
                                        tabIndex={1}
                                        disabled={processing}
                                        data-test="resend-verification-button"
                                    >
                                        {processing && <Spinner />}

                                        {!processing && (
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <line
                                                    x1="22"
                                                    y1="2"
                                                    x2="11"
                                                    y2="13"
                                                />
                                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                            </svg>
                                        )}

                                        {processing
                                            ? "Memproses..."
                                            : "Kirim Ulang Email Verifikasi"}
                                    </Button>
                                )}
                            </Form>

                            <div className="siram-back-wrapper">
                                <TextLink
                                    href={logout()}
                                    className="siram-back-link"
                                    tabIndex={2}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    Keluar
                                </TextLink>
                            </div>

                            <div className="siram-login-footer">
                                <div className="siram-footer-line" />

                                <p>Sistem Informasi Rumah Dinas</p>

                                <span>POLRESTA CILACAP</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
