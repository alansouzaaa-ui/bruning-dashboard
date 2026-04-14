import styles from './ConfirmModal.module.css'

/**
 * Modal de confirmação sem bloqueio de thread.
 * Substitui window.confirm() nativo.
 *
 * @param {{ message: string, onConfirm: () => void, onCancel: () => void }} props
 */
export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger"    onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
