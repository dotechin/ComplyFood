import { redirect } from 'next/navigation';

export default function ChecklistsPage() {
  redirect('/logs?type=checklist');
}
