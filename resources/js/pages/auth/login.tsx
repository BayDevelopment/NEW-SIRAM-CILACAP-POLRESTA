import { Form, Head } from "@inertiajs/react";
import InputError from "@/components/input-error";
import PasswordInput from "@/components/password-input";
import TextLink from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { request } from "@/routes/password";
import { store } from "@/routes/login";
import PasskeyVerify from "@/components/passkey-verify";

type Props = {
    status?: string;
    canResetPassword: boolean;
};

const LOGO_SRC = "/logo-polresta-cilacap-fiks.png";

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Masuk - SIRAM Polresta Cilacap" />

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
                            {/* Logo */}
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

                            {/* Bottom badge */}
                            <div className="siram-security-badge">
                                <span className="siram-security-dot" />
                                Sistem Internal Polresta Cilacap
                            </div>
                        </div>
                    </div>

                    {/* =========================
                        RIGHT SIDE - LOGIN
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
                                    SELAMAT DATANG
                                </span>

                                <h2>Masuk ke SIRAM</h2>

                                <p>
                                    Silakan masuk menggunakan akun yang telah
                                    terdaftar pada sistem.
                                </p>
                            </div>

                            <PasskeyVerify />

                            <Form
                                {...store.form()}
                                resetOnSuccess={["password"]}
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
                                                    autoComplete="email"
                                                    placeholder="Masukkan email"
                                                    className="siram-input"
                                                />
                                            </div>

                                            <InputError
                                                message={errors.email}
                                                className="siram-error"
                                            />
                                        </div>

                                        {/* Password */}
                                        <div className="siram-form-group">
                                            <div className="siram-password-label">
                                                <Label
                                                    htmlFor="password"
                                                    className="siram-label"
                                                >
                                                    Password
                                                </Label>

                                                {canResetPassword && (
                                                    <TextLink
                                                        href={request()}
                                                        className="siram-forgot-link"
                                                        tabIndex={5}
                                                    >
                                                        Lupa password?
                                                    </TextLink>
                                                )}
                                            </div>

                                            <div className="siram-input-wrapper">
                                                <svg
                                                    className="siram-input-icon"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                >
                                                    <rect
                                                        x="3"
                                                        y="11"
                                                        width="18"
                                                        height="10"
                                                        rx="2"
                                                    />
                                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                                </svg>

                                                <PasswordInput
                                                    id="password"
                                                    name="password"
                                                    required
                                                    tabIndex={2}
                                                    autoComplete="current-password"
                                                    placeholder="Masukkan password"
                                                    className="siram-password-input"
                                                />
                                            </div>

                                            <InputError
                                                message={errors.password}
                                                className="siram-error"
                                            />
                                        </div>

                                        {/* Remember */}
                                        <div className="siram-remember">
                                            <Checkbox
                                                id="remember"
                                                name="remember"
                                                tabIndex={3}
                                            />

                                            <Label
                                                htmlFor="remember"
                                                className="siram-remember-label"
                                            >
                                                Ingat saya
                                            </Label>
                                        </div>

                                        {/* Login Button */}
                                        <Button
                                            type="submit"
                                            className="siram-login-button"
                                            tabIndex={4}
                                            disabled={processing}
                                            data-test="login-button"
                                        >
                                            {processing && <Spinner />}

                                            {!processing && (
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                                                    <polyline points="10 17 15 12 10 7" />
                                                    <line
                                                        x1="15"
                                                        y1="12"
                                                        x2="3"
                                                        y2="12"
                                                    />
                                                </svg>
                                            )}

                                            {processing
                                                ? "Memproses..."
                                                : "Masuk ke Sistem"}
                                        </Button>

                                        {/* Status */}
                                        {status && (
                                            <div className="siram-status">
                                                {status}
                                            </div>
                                        )}
                                    </>
                                )}
                            </Form>

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
