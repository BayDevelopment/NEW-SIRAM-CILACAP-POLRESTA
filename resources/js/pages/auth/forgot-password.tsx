import { Form, Head } from "@inertiajs/react";
import InputError from "@/components/input-error";
import TextLink from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { login } from "@/routes";
import { email } from "@/routes/password";

const LOGO_SRC = "/logo-polresta-cilacap-fiks.png";

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Lupa Password - SIRAM Polresta Cilacap" />

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
                        RIGHT SIDE - FORGOT PASSWORD
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
                                <span className="siram-welcome">
                                    PEMULIHAN AKUN
                                </span>

                                <h2>Lupa Password?</h2>

                                <p>
                                    Masukkan email yang terdaftar. Kami akan
                                    mengirimkan tautan untuk mengatur ulang
                                    password Anda.
                                </p>
                            </div>

                            {status && (
                                <div className="siram-status">{status}</div>
                            )}

                            <Form
                                {...email.form()}
                                className="siram-login-form"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        {/* Email */}
                                        <div className="siram-form-group">
                                            <Label
                                                htmlFor="email"
                                                className="siram-label"
                                            >
                                                Email
                                            </Label>

                                            <div className="siram-input-wrapper">
                                                <svg
                                                    className="siram-input-icon"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                >
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                    <polyline points="22,6 12,13 2,6" />
                                                </svg>

                                                <Input
                                                    id="email"
                                                    type="email"
                                                    name="email"
                                                    required
                                                    autoFocus
                                                    tabIndex={1}
                                                    autoComplete="off"
                                                    placeholder="Masukkan email"
                                                    className="siram-input"
                                                />
                                            </div>

                                            <InputError
                                                message={errors.email}
                                                className="siram-error"
                                            />
                                        </div>

                                        {/* Submit */}
                                        <Button
                                            type="submit"
                                            className="siram-login-button"
                                            tabIndex={2}
                                            disabled={processing}
                                            data-test="email-password-reset-link-button"
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
                                                : "Kirim Tautan Reset Password"}
                                        </Button>
                                    </>
                                )}
                            </Form>

                            <div className="siram-back-wrapper">
                                <TextLink
                                    href={login()}
                                    className="siram-back-link"
                                    tabIndex={3}
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <line x1="19" y1="12" x2="5" y2="12" />
                                        <polyline points="12 19 5 12 12 5" />
                                    </svg>
                                    Kembali ke halaman masuk
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
