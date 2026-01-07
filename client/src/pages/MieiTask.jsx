import React from 'react';
import TaskPersonali from '../components/task/TaskPersonali';
import CreaTask from '../components/task/CreaTask';

import TaskCollettivi from '../components/task/TaskCollettivi';

export default function MieiTask() {
  return (
    <div className="space-y-6">
      <div className="bg-[#053c5e] text-white p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold font-display">Task</h1>
            <p className="text-lg opacity-90 mt-2">
              Gestisci i tuoi compiti, assegnane a socie e soci o invia un task per la postazione host.
            </p>
          </div>
          <div className="flex shrink-0">
            <CreaTask />
          </div>
        </div>
      </div>

      <TaskPersonali />
      <TaskCollettivi />
    </div>
  );
}
