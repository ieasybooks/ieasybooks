class CreateNotableJobs < ActiveRecord::Migration[7.1]
  def change
    create_table :notable_jobs do |t|
      t.string :note_type
      t.text :note
      t.text :job
      t.string :job_id
      t.string :queue
      t.float :runtime
      t.float :queued_time
      t.datetime :created_at
    end
  end
end
