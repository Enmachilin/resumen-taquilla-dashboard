import subprocess
import os

def run_git_command(command):
    try:
        result = subprocess.run(
            command,
            cwd=r"c:\Users\enmas\OneDrive\Desktop\Resumen de taquilla\resumen-taquilla",
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando {' '.join(command)}: {e.stderr}")
        return None

def main():
    print("Iniciando proceso de commit...")
    
    # 1. Stage changes
    print("Agregando cambios (git add .)...")
    run_git_command(["git", "add", "."])
    
    # 2. Determinar mensaje (Docs/Fix preferiblemente por los cambios en directivas)
    # Basado en los cambios vistos en ui_updates_SOP y entorno_local_SOP
    commit_message = "Docs: actualizar directivas con restricción de Pyre2 y sincronizar mejoras de UI"
    
    # 3. Commit
    print(f"Realizando commit: {commit_message}")
    res_commit = run_git_command(["git", "commit", "-m", commit_message])
    if res_commit:
        print(res_commit)
    
    # 4. Push
    print("Enviando cambios a GitHub (git push origin main)...")
    res_push = run_git_command(["git", "push", "origin", "main"])
    if res_push:
        print(res_push)
        print("\n¡Commit y Push completados con éxito!")
    else:
        # Intentar rebase si falló por estar desactualizado
        print("El push falló. Intentando pull --rebase...")
        run_git_command(["git", "pull", "origin", "main", "--rebase"])
        res_push_retry = run_git_command(["git", "push", "origin", "main"])
        if res_push_retry:
            print(res_push_retry)
            print("\n¡Commit y Push completados después de rebase!")

if __name__ == "__main__":
    main()
