import { LoginForm } from './login-form';

export default function Home() {
  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Browser workflow capture</p>
          <h1>Sign in</h1>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
